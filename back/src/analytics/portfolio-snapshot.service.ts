// back\src\analytics\portfolio-snapshot.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { MarketService } from '../modules/market/market.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class PortfolioSnapshotService {
  private readonly logger = new Logger(PortfolioSnapshotService.name);
  private readonly MIN_BALANCE = 0.000001;

  // 🔥 Ключ distributed lock для предотвращения одновременного выполнения appendMarketSnapshot
  // из разных инстансов или при повторном срабатывании крона
  private readonly APPEND_LOCK_KEY = 'lock:appendMarketSnapshot';
  private readonly APPEND_LOCK_TTL = 30; // секунд

  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketService,
    private readonly redis: RedisService, // 🔥 Добавлен Redis для distributed lock
  ) {}

  // Полная пересборка истории (вызывается при изменении транзакций)
  async rebuild() {
    this.logger.log('🔄 Полная пересборка истории...');
    const txs = await this.prisma.transaction.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (txs.length === 0) {
      this.logger.log('🔄 rebuild: транзакций нет, очищаем 1h-снимки');
      await this.prisma.portfolioSnapshot.deleteMany({
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
        if (amt > this.MIN_BALANCE) {
          total += amt * (lastPrices.get(sym) ?? 0);
        }
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

    // 🔥 ФИНАЛЬНАЯ ТОЧКА: Всегда берем актуальные цены, даже если кэш протух
    const activeSymbols = Array.from(balances.keys()).filter(
      (s) => (balances.get(s) ?? 0) > this.MIN_BALANCE,
    );

    if (activeSymbols.length > 0) {
      this.logger.log(
        `🔄 rebuild: запрашиваем актуальные цены для финальной точки [${activeSymbols.join(', ')}]`,
      );
      // getMarketData гарантированно вернет данные (обновит кэш при необходимости)
      // 🔥 Передаём caller='snapshot:rebuild' для отслеживания в логах MarketService
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

    // Атомарная замена
    await this.prisma.$transaction([
      this.prisma.portfolioSnapshot.deleteMany({
        where: { granularity: '1h' },
      }),
      this.prisma.portfolioSnapshot.createMany({ data: snapshots }),
    ]);

    this.logger.log(`📊 Snapshot rebuilt: ${snapshots.length} points saved.`);
  }

  // 🔥 ОДИН крон вместо двух: каждые 5 минут.
  // Это покрывает все сценарии:
  //   - активные пользователи получают свежие точки каждые 5 минут
  //   - при отсутствии активности MarketService всё равно обновляет Redis (cron:background:1h)
  //   - 5-минутный интервал даёт достаточно плавный график без лишней нагрузки на БД
  // Distributed lock через Redis предотвращает дубли при overlap'е срабатываний.
  @Cron(CronExpression.EVERY_5_MINUTES)
  async appendMarketSnapshot() {
    this.logger.debug('⏰ appendMarketSnapshot [cron:append:5m] сработал');
    await this.doAppendMarketSnapshot('cron:append:5m');
  }

  // 🔥 caller — источник вызова для прокидывания в MarketService
  private async doAppendMarketSnapshot(caller: string) {
    // 🔥 DISTRIBUTED LOCK: предотвращает одновременное выполнение из разных инстансов
    // или при race condition в рамках одного процесса
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
      // Защита от дублей: если последняя точка создана менее 4 минут назад, пропускаем
      // (4 минуты, чтобы не конфликтовать с 5-минутным кроном и оставить запас на jitter)
      const last = await this.prisma.portfolioSnapshot.findFirst({
        where: { granularity: '1h' },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true },
      });

      const fourMinutesAgo = new Date(Date.now() - 4 * 60_000);
      if (last && last.timestamp > fourMinutesAgo) {
        this.logger.debug(
          `⏭️ [${caller}] Пропуск: последняя точка создана ${Math.round((Date.now() - last.timestamp.getTime()) / 1000)}с назад`,
        );
        return; // Не спамим точками чаще раза в 4 минуты
      }

      const txs = await this.prisma.transaction.findMany({
        orderBy: { createdAt: 'asc' },
      });
      if (txs.length === 0) {
        this.logger.debug(`⏭️ [${caller}] Пропуск: транзакций нет`);
        return;
      }

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
      if (activeSymbols.length === 0) {
        this.logger.debug(`⏭️ [${caller}] Пропуск: активных символов нет`);
        return;
      }

      this.logger.log(
        `📈 [${caller}] Запрос рыночных цен для снимка портфеля [${activeSymbols.join(', ')}]`,
      );
      // Используем getMarketData, который гарантирует наличие цен
      // 🔥 Передаём caller для отслеживания в логах MarketService
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
        await this.prisma.portfolioSnapshot.create({
          data: {
            timestamp: new Date(),
            granularity: '1h',
            totalValue: rounded,
          },
        });
        this.logger.log(
          `💾 [${caller}] Market snapshot appended: $${rounded} (${activeSymbols.length} монет)`,
        );
      }
    } finally {
      // Явно освобождаем лок после завершения (TTL на случай падения процесса)
      await this.redis.del(this.APPEND_LOCK_KEY);
    }
  }

  // --- ROLLUP КРОНЫ (Без изменений, логика верная) ---
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

  private async aggregateLevel(
    source: string,
    target: string,
    windowHours: number,
  ) {
    const since = new Date(Date.now() - windowHours * 3600_000);
    const latest = await this.prisma.portfolioSnapshot.findFirst({
      where: { granularity: source, timestamp: { gte: since } },
      orderBy: { timestamp: 'desc' },
    });
    if (!latest) {
      this.logger.debug(
        `📦 aggregateLevel ${source}→${target}: нет данных за последние ${windowHours}ч`,
      );
      return;
    }

    await this.prisma.portfolioSnapshot.create({
      data: {
        timestamp: new Date(),
        granularity: target,
        totalValue: latest.totalValue,
      },
    });
    this.logger.log(`📦 Rollup ${source}→${target}: $${latest.totalValue}`);
  }

  private async cleanupOldPoints(granularity: string, maxAgeDays: number) {
    const cutoff = new Date(Date.now() - maxAgeDays * 86400_000);
    const deleted = await this.prisma.portfolioSnapshot.deleteMany({
      where: { granularity, timestamp: { lt: cutoff } },
    });
    if (deleted.count > 0)
      this.logger.log(
        `🧹 Cleaned ${deleted.count} old ${granularity} (старше ${maxAgeDays} дней)`,
      );
  }
}
