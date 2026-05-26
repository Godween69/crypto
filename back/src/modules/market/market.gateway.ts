// back/src/modules/market/market.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtWsGuard } from '../auth/guards/jwt-ws.guard';
import { Public } from '../auth/decorators/public.decorator';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: 'market',
})
// Важно: @Public() НЕ делает endpoint открытым для всех. Он лишь отключает глобальный HTTP-Guard. Безопасность обеспечивается вторым уровнем.
@Public() // Пропускаем глобальный HTTP JwtAuthGuard для WS-handshake
// Срабатывает ПОСЛЕ установки WS-соединения
@UseGuards(JwtWsGuard) // Проверяем токен из cookie/auth.token при подключении
export class MarketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(MarketGateway.name);
  private activeConnections = 0;

  // Константа для синхронизации с CronExpression.EVERY_5_MINUTES
  private readonly WS_INTERVAL_MS = 5 * 60 * 1000;
  private nextUpdateAt = Date.now() + this.WS_INTERVAL_MS;

  handleConnection(@ConnectedSocket() client: Socket) {
    this.activeConnections++;
    const user = (client.data as any).user;
    this.logger.log(
      `WS подключён: ${client.id} userId=${user?.id} (активных: ${this.activeConnections})`,
    );

    // Пересчёт устаревшей метки до ближайшего 5-мин слота
    if (this.nextUpdateAt <= Date.now()) {
      this.nextUpdateAt =
        Math.ceil(Date.now() / this.WS_INTERVAL_MS) * this.WS_INTERVAL_MS;
      this.logger.debug(
        'Устаревшая метка пересчитана до ближайшего 5-мин слота',
      );
    }

    // Отправляем TTL-метку при входе
    client.emit('market:ttl_sync', { nextUpdateAt: this.nextUpdateAt });

    // Подписываем на персональный room для событий портфеля
    client.join(`user:${user.id}`);
    // Общий канал для рыночных цен
    client.join('market:global');
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
    const user = (client.data as any)?.user;
    this.logger.log(
      `WS отключён: ${client.id} userId=${user?.id} (активных: ${this.activeConnections})`,
    );
  }

  hasActiveClients(): boolean {
    return this.activeConnections > 0;
  }

  setNextUpdateAt(timestamp: number) {
    this.nextUpdateAt = timestamp;
  }

  // Broadcast рыночных цен всем подключённым клиентам
  broadcastUpdate(data: unknown, nextUpdateAt: number) {
    this.logger.debug(
      `Broadcast market:sync → ${this.activeConnections} клиентам, nextUpdateAt=${new Date(nextUpdateAt).toISOString()}`,
    );
    this.server.to('market:global').emit('market:sync', {
      type: 'cache_updated',
      nextUpdateAt,
      data,
    });
  }

  // Персональное уведомление о пересчёте портфеля конкретного пользователя
  broadcastPortfolioRebuilt(userId: string) {
    this.server.to(`user:${userId}`).emit('portfolio:rebuilt');
  }
}
