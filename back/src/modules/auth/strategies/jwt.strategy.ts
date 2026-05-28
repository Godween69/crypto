// back/src/modules/auth/strategies/jwt.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { Role } from '@prisma/client'; // Импорт типа роли из сгенерированного Prisma Client

// Payload, который кодируется в JWT и декодируется при каждом запросе
export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: Role; // Роль пользователя для быстрой проверки прав без запросов к БД
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Основной источник: httpOnly cookie
        (req: Request) => req?.cookies?.access_token ?? null,
        // Фоллбэк для внешних API-клиентов
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  // Passport вызывает этот метод после успешной проверки подписи и срока токена
  async validate(payload: JwtPayload) {
    if (!payload.sub) throw new UnauthorizedException('Невалидный токен');
    // Возвращаем объект, который NestJS положит в request.user
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
