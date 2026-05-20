// back/src/modules/market/market.gateway.ts
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
  // NestJS инициализирует поле после подъёма адаптера
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(MarketGateway.name);

  // абсолютная метка следующего обновления
  private nextUpdateAt = Date.now() + 300_000;

  handleConnection(client: Socket) {
    // фиксируем открытие вкладки
    this.logger.log(`Клиент подключён: ${client.id}`);
    // отправляем метку при входе
    client.emit('market:ttl_sync', { nextUpdateAt: this.nextUpdateAt });
  }
  // фиксируем закрытие вкладки
  handleDisconnect(client: Socket) {
    this.logger.log(`Клиент отключён: ${client.id}`);
  }
  // обновляем глобальную метку после крона
  setNextUpdateAt(timestamp: number) {
    this.nextUpdateAt = timestamp;
  }

  broadcastUpdate(data: unknown, nextUpdateAt: number) {
    this.server.emit('market:sync', {
      type: 'cache_updated',
      nextUpdateAt,
      data,
    }); // пушим всем вкладкам
  }
}
