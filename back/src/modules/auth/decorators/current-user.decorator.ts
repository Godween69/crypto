// back/src/modules/auth/decorators/current-user.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Извлекает текущего пользователя из request (HTTP) или socket.data (WS)
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const type = ctx.getType();
    if (type === 'http') return ctx.switchToHttp().getRequest().user;
    if (type === 'ws') return ctx.switchToWs().getClient().data?.user;
    return null;
  },
);
