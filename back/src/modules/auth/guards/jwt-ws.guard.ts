// back/src/modules/auth/guards/jwt-ws.guard.ts

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';

// WS-Guard: валидирует JWT из handshake cookie или auth.token
@Injectable()
export class JwtWsGuard implements CanActivate {
  private readonly logger = new Logger(JwtWsGuard.name); // Стандартный NestJS Logger

  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();

    // Приоритет: явный auth.token (для мобильных/SDK) → httpOnly cookie
    let token: string | undefined = client.handshake?.auth?.token;

    if (!token) {
      const cookieHeader = client.handshake?.headers?.cookie ?? '';
      // Безопасный парсинг: regex извлекает значение до первой точки с запятой
      const match = cookieHeader.match(/access_token=([^;]+)/);
      token = match?.[1];
    }

    if (!token) {
      this.logger.debug(
        `[JwtWsGuard] Токен не найден в handshake, clientId=${client.id}`,
      );
      throw new WsException('Unauthorized: токен отсутствует');
    }

    try {
      // Асинхронная верификация JWT с проверкой подписи и срока
      const payload = await this.jwt.verifyAsync(token);

      // Сохраняем пользователя в client.data для использования в Gateway/Handlers
      (client.data as any).user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role, // Критично для будущей RBAC-проверки в WS
      };

      this.logger.debug(`[JwtWsGuard] Токен валиден, userId=${payload.sub}`);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown JWT error';
      this.logger.debug(
        `[JwtWsGuard] Ошибка верификации: ${msg}, clientId=${client.id}`,
      );
      throw new WsException('Unauthorized: невалидный или истёкший токен');
    }
  }
}
