// back/src/analytics/portfolio-snapshot.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../common/prisma/prisma.service';
import { MarketService } from '../modules/market/market.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class PortfolioSnapshotService {
  private readonly logger = new Logger(PortfolioSnapshotService.name);
  private readonly MIN_BALANCE = 0.000001;

  // Ключ distributed lock для предотвращения одновременного выполнения appendMarketSnapshot
  private readonly APPEND_LOCK_KEY = 'lock:appendMarketSnapshot';
  private readonly APPEND_LOCK_TTL = 30; // секунд

  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketService,
    private readonly redis: RedisService,
    private readonly cls: ClsService, // CLS для установки userId в системных задачах
  ) {}

  // Полная пересборка истории для ВСЕХ пользователей (вызывается при изменении транзакций)
  async rebuild() {
    // Системная операция: bypass фильтрации для получения списка пользователей
    const users = await this.cls.run(async () => {
      this.cls.set('bypassUserIdFilter', true);
      return this.prisma.x.user.findMany({ select: { id: true } });
    });

    for (const user of users) {
      await this.rebuildForUser(user.id);
    }
  }

  // Пересборка истории для конкретного пользователя
  async rebuildForUser(userId: string) {
    await this.cls.run(async () => {
      this.cls.set('userId', userId);

      this.logger.log(`🔄 Полная пересборка истории для userId=${userId}...`);
      // Используем расширенный клиент x для автоматической фильтрации по userId
      const txs = await this.prisma.x.transaction.findMany({
        orderBy: { createdAt: 'asc' },
      });

      if (txs.length === 0) {
        this.logger.log(
          `🔄 rebuild: транзакций нет, очищаем 1h-снимки для userId=${userId}`,
        );
        await this.prisma.x.portfolioSnapshot.deleteMany({
          where: { granularity: '1h' },
        });
        return;
      }

      this.logger.log(
        `🔄 rebuild: найдено транзакций: ${txs.length}, начинаем симуляцию баланса`,
      );
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

      // Финальная точка: всегда берём актуальные цены
      const activeSymbols = Array.from(balances.keys()).filter(
        (s) => (balances.get(s) ?? 0) > this.MIN_BALANCE,
      );
      if (activeSymbols.length > 0) {
        this.logger.log(
          `🔄 rebuild: запрашиваем актуальные цены для финальной точки [${activeSymbols.join(', ')}]`,
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
        }
      }

      // Атомарная замена снапшотов для текущего пользователя через расширенный клиент
      await this.prisma.x.$transaction([
        this.prisma.x.portfolioSnapshot.deleteMany({
          where: { granularity: '1h' },
        }),
        this.prisma.x.portfolioSnapshot.createMany({ data: snapshots as any }), // userId внедряется middleware
      ]);

      this.logger.log(
        `📊 Snapshot rebuilt для userId=${userId}: ${snapshots.length} points saved.`,
      );
    });
  }

  // Крон каждые 5 минут: добавляет точку для всех активных пользователей
  @Cron(CronExpression.EVERY_5_MINUTES)
  async appendMarketSnapshot() {
    this.logger.debug('⏰ appendMarketSnapshot [cron:append:5m] сработал');
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
        `⏭️ [${caller}] Пропуск: другой процесс уже выполняет appendMarketSnapshot (лок занят)`,
      );
      return;
    }

    try {
      // Получаем всех пользователей с транзакциями (bypass для системной операции)
      const users = await this.cls.run(async () => {
        this.cls.set('bypassUserIdFilter', true);
        return this.prisma.x.user.findMany({
          select: { id: true },
          where: { transactions: { some: {} } },
        });
      });

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
          `⏭️ [${caller}] Пропуск для userId=${userId}: последняя точка создана недавно`,
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
        // Используем расширенный клиент x: middleware автоматически добавит userId
        await this.prisma.x.portfolioSnapshot.create({
          data: {
            timestamp: new Date(),
            granularity: '1h',
            totalValue: rounded,
          } as any,
        });
        this.logger.log(
          `💾 [${caller}] Snapshot appended для userId=${userId}: $${rounded}`,
        );
      }
    });
  }

  // Rollup кроны: агрегация по всем пользователям
  @Cron('5 0 * * *')
  async rollup1hTo1d() {
    this.logger.debug('📦 rollup1hTo1d: старт ежедневной агрегации');
    await this.aggregateLevel('1h', '1d', 24);
    await this.cleanupOldPoints('1h', 7);
  }

  @Cron('10 0 * * 0')
  async rollup1dTo1w() {
    this.logger.debug('📦 rollup1dTo1w: старт еженедельной агрегации');
    await this.aggregateLevel('1d', '1w', 7);
    await this.cleanupOldPoints('1d', 90);
  }

  @Cron('15 0 1 * *')
  async rollup1wTo1m() {
    this.logger.debug('📦 rollup1wTo1m: старт ежемесячной агрегации');
    await this.aggregateLevel('1w', '1m', 31);
    await this.cleanupOldPoints('1w', 365);
  }

  // Агрегация уровня: берёт последнюю точку источника и создаёт точку целевого уровня
  private async aggregateLevel(
    source: string,
    target: string,
    windowHours: number,
  ) {
    // Bypass для системной операции: работаем со всеми пользователями
    await this.cls.run(async () => {
      this.cls.set('bypassUserIdFilter', true);

      const since = new Date(Date.now() - windowHours * 3600_000);
      const latest = await this.prisma.x.portfolioSnapshot.findFirst({
        where: { granularity: source, timestamp: { gte: since } },
        orderBy: { timestamp: 'desc' },
      });
      if (!latest) {
        this.logger.debug(
          `📦 aggregateLevel ${source}→${target}: нет данных за последние ${windowHours}ч`,
        );
        return;
      }

      await this.prisma.x.portfolioSnapshot.create({
        data: {
          timestamp: new Date(),
          granularity: target,
          totalValue: latest.totalValue,
          userId: latest.userId, // Сохраняем принадлежность пользователю
        } as any,
      });
      this.logger.log(`📦 Rollup ${source}→${target}: $${latest.totalValue}`);
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
          `🧹 Cleaned ${deleted.count} old ${granularity} (старше ${maxAgeDays} дней)`,
        );
      }
    });
  }
}
