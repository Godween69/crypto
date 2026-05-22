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
  private nextUpdateAt = Date.now() + 300_000; // метка следующего обновления

  handleConnection(client: Socket) {
    this.activeConnections++; // фиксируем новое подключение
    this.logger.log(
      `WS подключён: ${client.id} (активных: ${this.activeConnections})`,
    );
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
    this.server.emit('market:sync', {
      type: 'cache_updated',
      nextUpdateAt,
      data,
    }); // пушим всем вкладкам
  }
}
