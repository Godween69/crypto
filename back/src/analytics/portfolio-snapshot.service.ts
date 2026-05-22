import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { MarketService } from '../modules/market/market.service';

@Injectable()
export class PortfolioSnapshotService {
  private readonly logger = new Logger(PortfolioSnapshotService.name);
  private readonly MIN_BALANCE = 0.000001; // порог отсечения пылевых остатков

  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketService, // используется только для чтения актуальных цен из Redis
  ) {}

  // полная пересборка часовых точек при изменении транзакций
  async rebuild() {
    const txs = await this.prisma.transaction.findMany({
      orderBy: { createdAt: 'asc' },
    });
    if (txs.length === 0) {
      await this.prisma.portfolioSnapshot.deleteMany({
        where: { granularity: '1h' },
      });
      return;
    }

    const balances = new Map<string, number>();
    const lastPrices = new Map<string, number>();
    // явная типизация массива: Prisma требует granularity в каждом элементе
    const snapshots: {
      timestamp: Date;
      granularity: string;
      totalValue: number;
    }[] = [];

    // проходим сделки хронологически, восстанавливаем баланс и стоимость
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

      const rounded = Number(total.toFixed(2)); // округляем до центов, исключаем дрейф float
      if (rounded > 0) {
        snapshots.push({
          timestamp: tx.createdAt,
          granularity: '1h',
          totalValue: rounded,
        });
      }
    }

    // добавляем финальную точку по актуальным ценам Redis для синхронизации с виджетом портфеля
    const activeSymbols = Array.from(balances.keys()).filter(
      (s) => (balances.get(s) ?? 0) > this.MIN_BALANCE,
    );
    if (activeSymbols.length > 0) {
      const currentPrices = await this.market.getMarketData(activeSymbols);
      const currentMap = new Map(
        currentPrices.map((p) => [p.symbol, p.currentPrice]),
      );
      let marketTotal = 0;
      for (const sym of activeSymbols)
        marketTotal += (balances.get(sym) ?? 0) * (currentMap.get(sym) ?? 0);

      const finalValue = Number(marketTotal.toFixed(2));
      if (finalValue > 0) {
        snapshots.push({
          timestamp: new Date(),
          granularity: '1h',
          totalValue: finalValue,
        });
      }
    }

    // атомарная замена только часовых точек, старшие уровни не затрагиваются
    await this.prisma.$transaction([
      this.prisma.portfolioSnapshot.deleteMany({
        where: { granularity: '1h' },
      }),
      this.prisma.portfolioSnapshot.createMany({ data: snapshots }),
    ]);
    this.logger.debug(`Snapshot rebuilt: ${snapshots.length} 1h points saved`);
  }

  // ежечасная фиксация рыночной стоимости (работает даже без новых транзакций)
  @Cron(CronExpression.EVERY_HOUR)
  async appendMarketSnapshot() {
    const last = await this.prisma.portfolioSnapshot.findFirst({
      where: { granularity: '1h' },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });
    if (last && Date.now() - last.timestamp.getTime() < 50 * 60_000) return; // защита от дублей при рестарте

    const txs = await this.prisma.transaction.findMany({
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

    const currentPrices = await this.market.getMarketData(activeSymbols);
    const currentMap = new Map(
      currentPrices.map((p) => [p.symbol, p.currentPrice]),
    );
    let marketTotal = 0;
    for (const sym of activeSymbols)
      marketTotal += (balances.get(sym) ?? 0) * (currentMap.get(sym) ?? 0);

    const rounded = Number(marketTotal.toFixed(2));
    if (rounded > 0) {
      await this.prisma.portfolioSnapshot.create({
        data: { timestamp: new Date(), granularity: '1h', totalValue: rounded },
      });
      this.logger.debug(`Market snapshot appended: $${rounded}`);
    }
  }

  // 1h → 1d (ежедневно в 00:05)
  @Cron('5 0 * * *')
  async rollup1hTo1d() {
    await this.aggregateLevel('1h', '1d', 24);
    await this.cleanupOldPoints('1h', 7); // храним 1h только 7 дней
  }

  // 1d → 1w (каждое воскресенье в 00:10)
  @Cron('10 0 * * 0')
  async rollup1dTo1w() {
    await this.aggregateLevel('1d', '1w', 7);
    await this.cleanupOldPoints('1d', 90); // храним 1d только 90 дней
  }

  // 1w → 1m (1-го числа месяца в 00:15)
  @Cron('15 0 1 * *')
  async rollup1wTo1m() {
    await this.aggregateLevel('1w', '1m', 31);
    await this.cleanupOldPoints('1w', 365); // храним 1w только 1 год
  }

  // универсальный метод агрегации: берёт последнюю точку исходного уровня за окно
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
    if (!latest) return; // нет данных для агрегации

    await this.prisma.portfolioSnapshot.create({
      data: {
        timestamp: new Date(),
        granularity: target,
        totalValue: latest.totalValue,
      },
    });
    this.logger.debug(
      `Rollup ${source}→${target} saved: $${latest.totalValue}`,
    );
  }

  // удаление устаревших точек уровня
  private async cleanupOldPoints(granularity: string, maxAgeDays: number) {
    const cutoff = new Date(Date.now() - maxAgeDays * 86400_000);
    const deleted = await this.prisma.portfolioSnapshot.deleteMany({
      where: { granularity, timestamp: { lt: cutoff } },
    });
    if (deleted.count > 0)
      this.logger.debug(`Cleaned ${deleted.count} old ${granularity} points`);
  }
}
