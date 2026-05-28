// back/src/modules/auth/decorators/roles.decorator.ts

import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
// Декоратор сохраняет массив требуемых ролей в метаданных метода/класса
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
