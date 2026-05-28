// back/src/modules/auth/guards/roles.guard.ts

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Читаем требуемые роли из метаданных, установленных декоратором @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Если декоратор @Roles() не указан — пропускаем любого авторизованного пользователя
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Устанавливается JwtAuthGuard до запуска этого Guard

    // Разрешаем доступ, если роль пользователя есть в списке требуемых
    return user && requiredRoles.includes(user.role);
  }
}
