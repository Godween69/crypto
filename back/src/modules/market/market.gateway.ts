// back/src/modules/market/market.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JwtService } from '@nestjs/jwt';
import { Public } from '../auth/decorators/public.decorator';

interface ConnectedUser {
  socketId: string;
  userId: string;
  email?: string;
  connectedAt: Date;
}

@WebSocketGateway({
  cors: {
    // КРИТИЧНО: при credentials: true origin не может быть '*'
    // Браузер вырежет куки, если origin не совпадает с фронтендом
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: 'market',
})
@Public()
// @UseGuards(JwtWsGuard) УДАЛЁН: Guard не работает для handleConnection в NestJS
export class MarketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(MarketGateway.name);

  // Мапа активных подключений: socketId -> ConnectedUser
  private connections = new Map<string, ConnectedUser>();

  private readonly WS_INTERVAL_MS = 5 * 60 * 1000;
  private nextUpdateAt = Date.now() + this.WS_INTERVAL_MS;

  // Инжектим JwtService напрямую для верификации при handshake
  constructor(private readonly jwtService: JwtService) { }

  // Аутентификация происходит здесь, так как Guards не запускаются на подключение
  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      // 1. Извлекаем токен из cookie или auth.payload
      const cookieHeader = client.handshake.headers.cookie ?? '';
      let token = client.handshake.auth?.token as string | undefined;

      if (!token) {
        const match = cookieHeader.match(/access_token=([^;]+)/);
        token = match?.[1];
      }

      if (!token) {
        this.logger.debug(
          `[WS] ❌ Токен отсутствует в handshake, clientId=${client.id}`,
        );
        client.disconnect(true);
        return;
      }

      // 2. Верифицируем JWT асинхронно
      const payload = await this.jwtService.verifyAsync(token);
      const user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      // 3. Сохраняем пользователя в client.data для будущих @SubscribeMessage
      client.data.user = user;

      // 4. Регистрируем подключение в локальной мапе
      this.connections.set(client.id, {
        socketId: client.id,
        userId: user.id,
        email: user.email,
        connectedAt: new Date(),
      });

      this.logger.log(
        `[WS] ✅ Подключён: ${client.id} | userId=${user.id} | email=${user.email} | активных: ${this.connections.size}`,
      );

      // Синхронизация TTL при входе
      if (this.nextUpdateAt <= Date.now()) {
        this.nextUpdateAt =
          Math.ceil(Date.now() / this.WS_INTERVAL_MS) * this.WS_INTERVAL_MS;
      }
      client.emit('market:ttl_sync', { nextUpdateAt: this.nextUpdateAt });

      // Подписка на персональный и глобальный каналы
      client.join(`user:${user.id}`);
      client.join('market:global');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown auth error';
      this.logger.debug(
        `[WS] ❌ Ошибка авторизации: ${msg}, clientId=${client.id}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const connected = this.connections.get(client.id);
    if (!connected) return; // Был отклонён на этапе авторизации

    const duration = Math.round(
      (Date.now() - connected.connectedAt.getTime()) / 1000,
    );
    this.connections.delete(client.id);

    this.logger.log(
      `[WS] 🔌 Отключён: ${client.id} | userId=${connected.userId} | был в сети: ${duration}с | активных: ${this.connections.size}`,
    );
  }

  // Cron каждую минуту: логирование активных подключений
  @Cron(CronExpression.EVERY_MINUTE)
  logActiveConnections() {
    if (this.connections.size === 0) return;
    const summary = Array.from(this.connections.values())
      .map((c) => c.email ?? c.userId.substring(0, 8))
      .join(', ');
    this.logger.log(
      `[WS] 📡 Активных подключений: ${this.connections.size} → [${summary}]`,
    );
  }

  getActiveConnectionsCount(): number {
    return this.connections.size;
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
      `[WS] 📤 Broadcast market:sync → ${this.connections.size} клиентам`,
    );
    this.server.to('market:global').emit('market:sync', {
      type: 'cache_updated',
      nextUpdateAt,
      data,
    });
  }

  // Персональное уведомление о пересчёте портфеля
  broadcastPortfolioRebuilt(userId: string) {
    this.logger.debug(
      `[WS] 📊 Broadcast portfolio:rebuilt → userId=${userId}`,
    );
    this.server.to(`user:${userId}`).emit('portfolio:rebuilt');
  }
}
