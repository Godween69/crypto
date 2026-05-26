// back/src/modules/auth/guards/jwt-ws.guard.ts

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';

// WS-Guard: валидирует токен из handshake.auth.token ИЛИ из cookie access_token
@Injectable()
export class JwtWsGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();

    // Приоритет: auth.token > cookie > Authorization header
    let token: string | undefined = client.handshake?.auth?.token;

    if (!token) {
      const cookies = client.handshake?.headers?.cookie ?? '';
      const match = cookies
        .split('; ')
        .find((c) => c.startsWith('access_token='));
      token = match?.split('=')[1];
    }

    if (!token) {
      this.logger?.debug(
        `[JwtWsGuard] Токен не найден для clientId=${client.id}`,
      );
      throw new WsException(new UnauthorizedException('Токен не передан'));
    }

    try {
      const payload = await this.jwt.verifyAsync(token);
      (client.data as any).user = { id: payload.sub, email: payload.email };
      return true;
    } catch (err) {
      if (err instanceof Error) {
        this.logger?.debug(
          `[JwtWsGuard] Ошибка верификации токена: ${err.message}`,
        );
      }
      throw new WsException(
        new UnauthorizedException('Невалидный или истёкший токен'),
      );
    }
  }

  // Добавляем логгер для отладки, если нужно
  private readonly logger = new (require('@nestjs/common').Logger)(
    JwtWsGuard.name,
  );
}
