// back/src/common/prisma/prisma.service.ts

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

const USER_SCOPED_MODELS = [
  'Transaction',
  'PortfolioSnapshot',
  'RefreshSession',
];

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  public x: PrismaClient;
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly cls: ClsService) {
    super();
    this.x = this.createExtendedClient();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('[Prisma] Подключение к БД установлено');
  }

  private createExtendedClient(): PrismaClient {
    const clsRef = this.cls;
    const loggerRef = this.logger;

    return this.$extends({
      query: {
        $allModels: {
          $allOperations: ({ model, operation, args, query }) => {
            // Логируем только пользовательские модели для чистоты логов
            if (!model || !USER_SCOPED_MODELS.includes(model)) {
              return query(args);
            }

            const userId = clsRef.get<string | null>('userId');
            const bypassFilter =
              clsRef.get<boolean>('bypassUserIdFilter') ?? false;

            loggerRef.debug(
              `[Prisma] Операция: ${model}.${operation}, userId в CLS: ${userId}, bypass: ${bypassFilter}`,
            );

            if (bypassFilter) {
              loggerRef.debug(`[Prisma] Bypass активен, пропускаем фильтрацию`);
              return query(args);
            }

            if (!userId) {
              const error = `Access denied: userId missing in CLS for ${model}.${operation}`;
              loggerRef.error(`[Prisma] ${error}`);
              throw new Error(error);
            }

            // Защита от подмены userId
            if (
              (args as any)?.where?.userId &&
              (args as any).where.userId !== userId
            ) {
              const error = `Security violation: attempt to access different user's ${model}`;
              loggerRef.error(`[Prisma] ${error}`);
              throw new Error(error);
            }

            // READ операции
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
              loggerRef.debug(
                `[Prisma] Добавлен фильтр where.userId=${userId}`,
              );
            }

            // CREATE операция
            if (operation === 'create') {
              (args as any).data = { ...(args as any).data, userId };
              loggerRef.debug(`[Prisma] Добавлен data.userId=${userId}`);
            }

            // UPDATE/DELETE операции
            if (
              ['update', 'delete', 'updateMany', 'deleteMany'].includes(
                operation,
              )
            ) {
              (args as any).where = { ...(args as any).where, userId };
              loggerRef.debug(
                `[Prisma] Добавлен фильтр where.userId=${userId}`,
              );
            }

            // UPSERT операция
            if (operation === 'upsert') {
              (args as any).where = { ...(args as any).where, userId };
              (args as any).create = { ...(args as any).create, userId };
              (args as any).update = { ...(args as any).update, userId };
              loggerRef.debug(`[Prisma] Добавлен userId во все части upsert`);
            }

            return query(args);
          },
        },
      },
    }) as unknown as PrismaClient;
  }
}
