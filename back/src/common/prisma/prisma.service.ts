// back/src/common/prisma/prisma.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

// Модели, требующие обязательной фильтрации по пользователю
const USER_SCOPED_MODELS = [
  'Transaction',
  'PortfolioSnapshot',
  'RefreshSession',
];

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  // Расширенный клиент с автоматической изоляцией данных
  public x: PrismaClient;

  constructor(private readonly cls: ClsService) {
    super();
    // Передаём cls через замыкание, так как $extends не поддерживает DI
    this.x = this.$extends({
      query: {
        $allModels: {
          $allOperations: ({ model, operation, args, query }) => {
            // Пропускаем модели, не требующие изоляции
            if (!model || !USER_SCOPED_MODELS.includes(model)) {
              return query(args);
            }

            const userId = cls.get<string | null>('userId');
            const bypassFilter =
              cls.get<boolean>('bypassUserIdFilter') ?? false;

            // Разрешаем системные операции при явном флаге bypass
            if (bypassFilter) return query(args);

            // Блокируем доступ при отсутствии userId в контексте
            if (!userId) {
              throw new Error(
                `Access denied: userId missing in CLS for ${model}.${operation}`,
              );
            }

            // Защита от подмены userId в where-клаузе
            if (
              (args as any)?.where?.userId &&
              (args as any).where.userId !== userId
            ) {
              throw new Error(
                `Security violation: attempt to access different user's ${model}`,
              );
            }

            // Логирование в режиме разработки
            if (process.env.NODE_ENV === 'development') {
              console.debug(
                `[Prisma] User scope: ${model}.${operation} userId=${userId}`,
              );
            }

            // READ: фильтруем все операции чтения
            if (
              [
                'findMany',
                'findFirst',
                'findUnique',
                'count',
                'aggregate',
              ].includes(operation)
            ) {
              (args as any).where = { ...(args as any).where, userId };
            }

            // CREATE: привязываем запись к пользователю
            if (operation === 'create') {
              (args as any).data = { ...(args as any).data, userId };
            }

            // UPDATE/DELETE: защищаем от чужих записей
            if (
              ['update', 'delete', 'updateMany', 'deleteMany'].includes(
                operation,
              )
            ) {
              (args as any).where = { ...(args as any).where, userId };
            }

            // UPSERT: применяем userId ко всем частям
            if (operation === 'upsert') {
              (args as any).where = { ...(args as any).where, userId };
              (args as any).create = { ...(args as any).create, userId };
              (args as any).update = { ...(args as any).update, userId };
            }

            return query(args);
          },
        },
      },
    }) as unknown as PrismaClient;
  }

  async onModuleInit() {
    await this.$connect();
  }
}
