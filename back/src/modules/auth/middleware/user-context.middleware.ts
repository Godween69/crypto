// back/src/modules/auth/middleware/user-context.middleware.ts

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClsService } from 'nestjs-cls';

// Прокладывает userId из Passport в AsyncLocalStorage для Prisma middleware
@Injectable()
export class UserContextMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    // Passport уже поместил пользователя в req.user через JwtStrategy
    const userId = (req as any).user?.id ?? null;
    this.cls.set('userId', userId);
    next();
  }
}
