// back/src/modules/auth/strategies/jwt.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express'; // import type устраняет ошибку isolatedModules

// Payload, который кодируется в JWT
export interface JwtPayload {
  sub: string; // userId (cuid)
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Главный источник: httpOnly cookie 'access_token'
        (req: Request) => req?.cookies?.access_token ?? null,
        // Фоллбэк: Authorization header для API-клиентов
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  // Passport кладёт результат в request.user
  async validate(payload: JwtPayload): Promise<{ id: string; email: string }> {
    if (!payload.sub) throw new UnauthorizedException('Невалидный токен');
    return { id: payload.sub, email: payload.email };
  }
}
