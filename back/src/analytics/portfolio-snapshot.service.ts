// back/src/analytics/portfolio-snapshot.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../common/prisma/prisma.service';
import { MarketService } from '../modules/market/market.service';
import { MarketGateway } from '../modules/market/market.gateway'; // <-- ИМПОРТ WS-гейтвея
import { RedisService } from '../redis/redis.service';

@Injectable()
export class PortfolioSnapshotService {
  private readonly logger = new Logger(PortfolioSnapshotService.name);
  private readonly MIN_BALANCE = 0.000001;

  // Ключ distributed lock для предотвращения одновременного выполнения appendMarketSnapshot
  private readonly APPEND_LOCK_KEY = 'lock:appendMarketSnapshot';
  private readonly APPEND_LOCK_TTL = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketService,
    private readonly redis: RedisService,
    private readonly cls: ClsService,
    private readonly marketGateway: MarketGateway, // <-- ИНЖЕКТ WS-гейтвея для уведомлений фронта
  ) {}

  // Полная пересборка истории для ВСЕХ пользователей с транзакциями
  async rebuild() {
    this.logger.log(
      '[Snapshot:Rebuild] Начало полной пересборки для всех пользователей',
    );

    const users = await this.cls.run(async () => {
      this.cls.set('bypassUserIdFilter', true);
      return this.prisma.x.user.findMany({
        select: { id: true },
        where: { transactions: { some: {} } },
      });
    });

    this.logger.log(
      `[Snapshot:Rebuild] Найдено ${users.length} пользователей с транзакциями`,
    );

    for (const user of users) {
      try {
        await this.rebuildForUser(user.id);
      } catch (err: unknown) {
        if (err instanceof Error) {
          this.logger.error(
            `[Snapshot:Rebuild] Ошибка rebuild для userId=${user.id}: ${err.message}`,
            err.stack,
          );
        } else {
          this.logger.error(
            `[Snapshot:Rebuild] Неизвестная ошибка rebuild для userId=${user.id}`,
          );
        }
      }
    }

    this.logger.log('[Snapshot:Rebuild] Полная пересборка завершена');
  }

  // Пересборка истории для конкретного пользователя
  async rebuildForUser(userId: string) {
    this.logger.debug(
      `[Snapshot:RebuildUser] Начало rebuild для userId=${userId}`,
    );

    await this.cls.run(async () => {
      this.cls.set('userId', userId);

      const txs = await this.prisma.x.transaction.findMany({
        orderBy: { createdAt: 'asc' },
      });
      this.logger.debug(
        `[Snapshot:RebuildUser] Найдено транзакций: ${txs.length} для userId=${userId}`,
      );

      if (txs.length === 0) {
        this.logger.debug(
          `[Snapshot:RebuildUser] Транзакций нет, очищаем 1h-снимки для userId=${userId}`,
        );
        await this.cls.run(async () => {
          this.cls.set('bypassUserIdFilter', true);
          await this.prisma.x.portfolioSnapshot.deleteMany({
            where: { granularity: '1h', userId },
          });
        });

        // Уведомляем фронтенд, что портфель изменился (даже если он теперь пустой)
        this.marketGateway.broadcastPortfolioRebuilt(userId);
        return;
      }

      // Симуляция баланса по транзакциям
      const balances = new Map<string, number>();
      const lastPrices = new Map<string, number>();
      const snapshots: {
        timestamp: Date;
        granularity: string;
        totalValue: number;
      }[] = [];

      for (const tx of txs) {
        const prev = balances.get(tx.symbol) ?? 0;
        balances.set(
          tx.symbol,
          tx.type === 'BUY' ? prev + tx.amount : prev - tx.amount,
        );
        if (tx.price > 0) lastPrices.set(tx.symbol, tx.price);

        let total = 0;
        for (const [sym, amt] of balances.entries()) {
          if (amt > this.MIN_BALANCE) total += amt * (lastPrices.get(sym) ?? 0);
        }

        const rounded = Number(total.toFixed(2));
        if (rounded > 0) {
          snapshots.push({
            timestamp: tx.createdAt,
            granularity: '1h',
            totalValue: rounded,
          });
        }
      }

      this.logger.debug(
        `[Snapshot:RebuildUser] Рассчитано ${snapshots.length} точек из транзакций`,
      );

      // Финальная точка с актуальными рыночными ценами
      const activeSymbols = Array.from(balances.keys()).filter(
        (s) => (balances.get(s) ?? 0) > this.MIN_BALANCE,
      );

      if (activeSymbols.length > 0) {
        this.logger.debug(
          `[Snapshot:RebuildUser] Запрос актуальных цен для [${activeSymbols.join(', ')}]`,
        );
        const currentPrices = await this.market.getMarketData(
          activeSymbols,
          'snapshot:rebuild',
        );
        const currentMap = new Map(
          currentPrices.map((p) => [p.symbol, p.currentPrice]),
        );

        let marketTotal = 0;
        for (const sym of activeSymbols) {
          marketTotal += (balances.get(sym) ?? 0) * (currentMap.get(sym) ?? 0);
        }

        const finalValue = Number(marketTotal.toFixed(2));
        if (finalValue > 0) {
          snapshots.push({
            timestamp: new Date(),
            granularity: '1h',
            totalValue: finalValue,
          });
          this.logger.debug(
            `[Snapshot:RebuildUser] Финальная точка: $${finalValue}`,
          );
        }
      }

      // Атомарная замена снапшотов с детальным логированием
      try {
        await this.cls.run(async () => {
          this.cls.set('bypassUserIdFilter', true);

          this.logger.debug(
            `[Snapshot:RebuildUser] Удаление старых 1h-снапшотов для userId=${userId}`,
          );
          const deleted = await this.prisma.x.portfolioSnapshot.deleteMany({
            where: { granularity: '1h', userId },
          });
          this.logger.debug(
            `[Snapshot:RebuildUser] Удалено ${deleted.count} старых снапшотов`,
          );

          if (snapshots.length > 0) {
            this.logger.debug(
              `[Snapshot:RebuildUser] Создание ${snapshots.length} новых снапшотов для userId=${userId}`,
            );
            await this.prisma.x.portfolioSnapshot.createMany({
              data: snapshots.map((s) => ({ ...s, userId })) as any,
            });
          }
        });

        this.logger.log(
          `[Snapshot:RebuildUser] Rebuilt успешно: userId=${userId}, точек=${snapshots.length}`,
        );

        // 🔥 УВЕДОМЛЕНИЕ ФРОНТЕНДА: отправляем персональное событие portfolio:rebuilt
        // Фронтенд слушает это событие через useMarketSocket и инвалидирует кэш графика
        this.marketGateway.broadcastPortfolioRebuilt(userId);
      } catch (err: unknown) {
        if (err instanceof Error) {
          this.logger.error(
            `[Snapshot:RebuildUser] Ошибка при сохранении снапшотов для userId=${userId}: ${err.message}`,
            err.stack,
          );
        } else {
          this.logger.error(
            `[Snapshot:RebuildUser] Неизвестная ошибка при сохранении снапшотов для userId=${userId}`,
          );
        }
        throw err;
      }
    });
  }

  // Крон каждые 5 минут: добавляет точку для всех активных пользователей
  @Cron(CronExpression.EVERY_5_MINUTES)
  async appendMarketSnapshot() {
    this.logger.debug('[Snapshot:Append] Cron appendMarketSnapshot сработал');
    await this.doAppendMarketSnapshot('cron:append:5m');
  }

  // Основная логика добавления точки с distributed lock
  private async doAppendMarketSnapshot(caller: string) {
    const acquired = await this.redis.acquireLock(
      this.APPEND_LOCK_KEY,
      this.APPEND_LOCK_TTL,
    );
    if (!acquired) {
      this.logger.debug(
        `[Snapshot:Append] Пропуск: лок занят другим процессом`,
      );
      return;
    }

    try {
      const users = await this.cls.run(async () => {
        this.cls.set('bypassUserIdFilter', true);
        return this.prisma.x.user.findMany({
          select: { id: true },
          where: { transactions: { some: {} } },
        });
      });

      this.logger.debug(
        `[Snapshot:Append] Найдено ${users.length} пользователей для append`,
      );

      for (const user of users) {
        await this.appendSnapshotForUser(user.id, caller);
      }
    } finally {
      await this.redis.del(this.APPEND_LOCK_KEY);
    }
  }

  // Добавление точки для одного пользователя
  private async appendSnapshotForUser(userId: string, caller: string) {
    await this.cls.run(async () => {
      this.cls.set('userId', userId);

      // Защита от дублей: если последняя точка создана менее 4 минут назад, пропускаем
      const last = await this.prisma.x.portfolioSnapshot.findFirst({
        where: { granularity: '1h' },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true },
      });

      const fourMinutesAgo = new Date(Date.now() - 4 * 60_000);
      if (last && last.timestamp > fourMinutesAgo) {
        this.logger.debug(
          `[Snapshot:Append] Пропуск для userId=${userId}: последняя точка создана недавно`,
        );
        return;
      }

      const txs = await this.prisma.x.transaction.findMany({
        orderBy: { createdAt: 'asc' },
      });
      if (txs.length === 0) return;

      const balances = new Map<string, number>();
      for (const tx of txs) {
        const prev = balances.get(tx.symbol) ?? 0;
        balances.set(
          tx.symbol,
          tx.type === 'BUY' ? prev + tx.amount : prev - tx.amount,
        );
      }

      const activeSymbols = Array.from(balances.keys()).filter(
        (s) => (balances.get(s) ?? 0) > this.MIN_BALANCE,
      );
      if (activeSymbols.length === 0) return;

      const currentPrices = await this.market.getMarketData(
        activeSymbols,
        caller,
      );
      const currentMap = new Map(
        currentPrices.map((p) => [p.symbol, p.currentPrice]),
      );

      let marketTotal = 0;
      for (const sym of activeSymbols) {
        marketTotal += (balances.get(sym) ?? 0) * (currentMap.get(sym) ?? 0);
      }

      const rounded = Number(marketTotal.toFixed(2));
      if (rounded > 0) {
        try {
          await this.cls.run(async () => {
            this.cls.set('bypassUserIdFilter', true);
            await this.prisma.x.portfolioSnapshot.create({
              data: {
                timestamp: new Date(),
                granularity: '1h',
                totalValue: rounded,
                userId,
              } as any,
            });
          });
          this.logger.log(
            `[Snapshot:Append] Точка добавлена: userId=${userId}, $${rounded}`,
          );

          // 🔥 УВЕДОМЛЕНИЕ ФРОНТЕНДА: новая точка снапшота — фронт обновит график
          this.marketGateway.broadcastPortfolioRebuilt(userId);
        } catch (err: unknown) {
          if (err instanceof Error) {
            this.logger.error(
              `[Snapshot:Append] Ошибка создания снапшота для userId=${userId}: ${err.message}`,
              err.stack,
            );
          } else {
            this.logger.error(
              `[Snapshot:Append] Неизвестная ошибка создания снапшота для userId=${userId}`,
            );
          }
        }
      }
    });
  }

  // Rollup кроны: агрегация по всем пользователям
  @Cron('5 0 * * *')
  async rollup1hTo1d() {
    this.logger.debug('[Snapshot:Rollup] Старт ежедневной агрегации 1h→1d');
    await this.aggregateLevel('1h', '1d', 24);
    await this.cleanupOldPoints('1h', 7);
  }

  @Cron('10 0 * * 0')
  async rollup1dTo1w() {
    this.logger.debug('[Snapshot:Rollup] Старт еженедельной агрегации 1d→1w');
    await this.aggregateLevel('1d', '1w', 7);
    await this.cleanupOldPoints('1d', 90);
  }

  @Cron('15 0 1 * *')
  async rollup1wTo1m() {
    this.logger.debug('[Snapshot:Rollup] Старт ежемесячной агрегации 1w→1m');
    await this.aggregateLevel('1w', '1m', 31);
    await this.cleanupOldPoints('1w', 365);
  }

  // Агрегация уровня: берёт последнюю точку источника и создаёт точку целевого уровня
  private async aggregateLevel(
    source: string,
    target: string,
    windowHours: number,
  ) {
    await this.cls.run(async () => {
      this.cls.set('bypassUserIdFilter', true);

      const since = new Date(Date.now() - windowHours * 3600_000);
      const latest = await this.prisma.x.portfolioSnapshot.findFirst({
        where: { granularity: source, timestamp: { gte: since } },
        orderBy: { timestamp: 'desc' },
      });
      if (!latest) {
        this.logger.debug(
          `[Snapshot:Rollup] Нет данных ${source} за последние ${windowHours}ч`,
        );
        return;
      }

      await this.prisma.x.portfolioSnapshot.create({
        data: {
          timestamp: new Date(),
          granularity: target,
          totalValue: latest.totalValue,
          userId: latest.userId,
        } as any,
      });
      this.logger.log(
        `[Snapshot:Rollup] ${source}→${target}: $${latest.totalValue} для userId=${latest.userId}`,
      );

      // 🔥 УВЕДОМЛЕНИЕ ФРОНТЕНДА: агрегированный снапшот создан — фронт обновит долгосрочный график
      this.marketGateway.broadcastPortfolioRebuilt(latest.userId);
    });
  }

  // Очистка устаревших точек
  private async cleanupOldPoints(granularity: string, maxAgeDays: number) {
    await this.cls.run(async () => {
      this.cls.set('bypassUserIdFilter', true);

      const cutoff = new Date(Date.now() - maxAgeDays * 86400_000);
      const deleted = await this.prisma.x.portfolioSnapshot.deleteMany({
        where: { granularity, timestamp: { lt: cutoff } },
      });
      if (deleted.count > 0) {
        this.logger.log(
          `[Snapshot:Cleanup] Удалено ${deleted.count} старых точек ${granularity} (старше ${maxAgeDays} дней)`,
        );
      }
    });
  }
}