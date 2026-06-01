// back/src/modules/auth/interceptors/user-context.interceptor.ts

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Observable } from 'rxjs';

@Injectable()
export class UserContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(UserContextInterceptor.name);

  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;

    // Passport уже положил user в request.user (так как Guard прошёл успешно)
    const userId = request.user?.id ?? null;

    this.logger.log(
      `[CLS] Запрос ${method} ${url}. userId из req.user: ${userId}`,
    );

    // Записываем userId в CLS контекст для текущего запроса
    this.cls.set('userId', userId);

    return next.handle();
  }
}
