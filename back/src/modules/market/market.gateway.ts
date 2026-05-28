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
import { Cron, CronExpression } from '@nestjs/schedule';
import { JwtWsGuard } from '../auth/guards/jwt-ws.guard';
import { Public } from '../auth/decorators/public.decorator';

interface ConnectedUser {
  socketId: string;
  userId: string;
  email?: string;
  connectedAt: Date;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: 'market',
})
@Public()
@UseGuards(JwtWsGuard)
export class MarketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(MarketGateway.name);

  // Мапа активных подключений
  private connections = new Map<string, ConnectedUser>();

  private readonly WS_INTERVAL_MS = 5 * 60 * 1000;
  private nextUpdateAt = Date.now() + this.WS_INTERVAL_MS;

  handleConnection(@ConnectedSocket() client: Socket) {
    const user = (client.data as any)?.user;

    // Если Guard пропустил без user — закрываем ТИХО (debug вместо warn)
    // Это ожидаемое поведение при race condition с Set-Cookie
    if (!user || !user.id) {
      this.logger.debug(
        `[WS] Подключение отклонено: нет пользователя (clientId=${client.id}). Ожидается при race condition с cookies.`,
      );
      client.disconnect(true);
      return;
    }

    // Сохраняем подключение
    this.connections.set(client.id, {
      socketId: client.id,
      userId: user.id,
      email: user.email,
      connectedAt: new Date(),
    });

    this.logger.log(
      `[WS] ✅ Подключён: ${client.id} | userId=${user.id} | email=${user.email ?? 'N/A'} | активных: ${this.connections.size}`,
    );

    // Пересчёт TTL до ближайшего 5-мин слота
    if (this.nextUpdateAt <= Date.now()) {
      this.nextUpdateAt =
        Math.ceil(Date.now() / this.WS_INTERVAL_MS) * this.WS_INTERVAL_MS;
    }

    // Отправляем TTL-метку при входе
    client.emit('market:ttl_sync', { nextUpdateAt: this.nextUpdateAt });

    // Подписываем на персональный room
    client.join(`user:${user.id}`);
    // Общий канал для рыночных цен
    client.join('market:global');
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const user = (client.data as any)?.user;
    const connected = this.connections.get(client.id);
    const duration = connected
      ? Math.round((Date.now() - connected.connectedAt.getTime()) / 1000)
      : 0;

    // Если пользователь не был в мапе — значит Guard отклонил подключение, логируем тихо
    if (!connected) {
      this.logger.debug(`[WS] Отключён без авторизации: ${client.id}`);
      return;
    }

    this.connections.delete(client.id);

    this.logger.log(
      `[WS] 🔌 Отключён: ${client.id} | userId=${user?.id ?? 'N/A'} | был в сети: ${duration}с | активных: ${this.connections.size}`,
    );
  }

  // Cron каждую минуту: логируем активные подключения
  @Cron(CronExpression.EVERY_MINUTE)
  logActiveConnections() {
    if (this.connections.size === 0) return;

    const summary = Array.from(this.connections.values())
      .map((c) => `${c.email ?? c.userId.substring(0, 8)}`)
      .join(', ');

    this.logger.log(
      `[WS] 📡 Активных подключений: ${this.connections.size} → [${summary}]`,
    );
  }

  getActiveConnectionsCount(): number {
    return this.connections.size;
  }

  getConnectionsDetails(): ConnectedUser[] {
    return Array.from(this.connections.values());
  }

  hasActiveClients(): boolean {
    return this.connections.size > 0;
  }

  setNextUpdateAt(timestamp: number) {
    this.nextUpdateAt = timestamp;
  }

  // Broadcast рыночных цен всем клиентам
  broadcastUpdate(data: unknown, nextUpdateAt: number) {
    this.logger.debug(
      `[WS] 📤 Broadcast market:sync → ${this.connections.size} клиентам, nextUpdateAt=${new Date(nextUpdateAt).toISOString()}`,
    );
    this.server.to('market:global').emit('market:sync', {
      type: 'cache_updated',
      nextUpdateAt,
      data,
    });
  }

  // Персональное уведомление о пересчёте портфеля
  broadcastPortfolioRebuilt(userId: string) {
    // Безопасная проверка: adapter/rooms могут быть undefined при вызове из крона/фона
    const rooms = this.server?.sockets?.adapter?.rooms;
    const roomSize = rooms?.get(`user:${userId}`)?.size ?? 0;

    this.logger.debug(
      `[WS] 📊 Broadcast portfolio:rebuilt → userId=${userId} (${roomSize} подключений в room)`,
    );

    // Отправляем событие только если есть активные подписчики
    if (roomSize > 0) {
      this.server.to(`user:${userId}`).emit('portfolio:rebuilt');
    }
  }
}
