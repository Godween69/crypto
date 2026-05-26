// back/src/modules/auth/decorators/public.decorator.ts

import { SetMetadata } from '@nestjs/common';

// Ключ метаданных для пометки маршрутов как публичных (без JWT-проверки)
export const IS_PUBLIC_KEY = 'isPublic';

// Декоратор: помечает маршрут как доступный без аутентификации
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
