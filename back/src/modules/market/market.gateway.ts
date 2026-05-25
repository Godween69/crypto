// back\src\modules\market\market.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: 'market' })
export class MarketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server; // NestJS инициализирует после подъёма адаптера
  private readonly logger = new Logger(MarketGateway.name);
  private activeConnections = 0; // счётчик живых WS-соединений

  // вынес интервал в константу, чтобы синхронизировать с CronExpression.EVERY_5_MINUTES
  // и избежать магического числа 300_000 в разных местах кода
  private readonly WS_INTERVAL_MS = 5 * 60 * 1000;

  private nextUpdateAt = Date.now() + 5 * 60 * 1000; // метка следующего обновления

  handleConnection(client: Socket) {
    this.activeConnections++; // фиксируем новое подключение
    this.logger.log(
      `WS подключён: ${client.id} (активных: ${this.activeConnections})`,
    );

    // если nextUpdateAt устарела (например, сервер работал без клиентов и крон не
    // вызывал setNextUpdateAt), вычисляем следующую 5-минутную границу.
    // Это предотвращает отправку клиенту "мусорной" метки из прошлого, из-за которой
    // индикатор на фронте сразу показывал "—" вместо обратного отсчёта.
    if (this.nextUpdateAt <= Date.now()) {
      this.nextUpdateAt =
        Math.ceil(Date.now() / this.WS_INTERVAL_MS) * this.WS_INTERVAL_MS;
      this.logger.debug(
        `Устаревшая метка пересчитана до ближайшего 5-мин слота`,
      );
    }

    client.emit('market:ttl_sync', { nextUpdateAt: this.nextUpdateAt }); // отправляем метку при входе
  }

  handleDisconnect(client: Socket) {
    this.activeConnections = Math.max(0, this.activeConnections - 1); // безопасно уменьшаем счётчик
    this.logger.log(
      `WS отключён: ${client.id} (активных: ${this.activeConnections})`,
    );
  }

  hasActiveClients(): boolean {
    return this.activeConnections > 0; // возвращаем true только при наличии живых сокетов
  }

  setNextUpdateAt(timestamp: number) {
    this.nextUpdateAt = timestamp; // обновляем метку после успешного крона
  }

  broadcastUpdate(data: unknown, nextUpdateAt: number) {
    this.logger.debug(
      `Broadcast market:sync → ${this.activeConnections} клиентам, nextUpdateAt=${new Date(nextUpdateAt).toISOString()}`,
    );
    this.server.emit('market:sync', {
      type: 'cache_updated',
      nextUpdateAt,
      data,
    }); // пушим всем вкладкам
  }
}
