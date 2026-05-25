// back/src/modules/portfolio/portfolio.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MarketService } from '../market/market.service';
import { calculatePortfolio } from './core/calculatePortfolio';
import type { PortfolioItem } from './types/portfolio.types';
import type { Transaction } from '@prisma/client';

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketService,
  ) {}

  async getPortfolio(): Promise<PortfolioItem[]> {
    const transactions = await this.prisma.transaction.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (transactions.length === 0) return [];

    const symbols = [...new Set(transactions.map((t) => t.symbol))];
    const marketData = await this.market.getMarketData(
      symbols,
      'portfolio:service',
    );

    const priceMap = new Map<
      string,
      { currentPrice: number; change24h: number }
    >();
    for (const m of marketData) {
      priceMap.set(m.symbol, {
        currentPrice: m.currentPrice,
        change24h: m.change24h ?? 0,
      });
    }

    // В рантайме Prisma возвращает ровно те поля, что ожидает Transaction,
    // а type всегда будет 'BUY' или 'SELL'.
    return calculatePortfolio(transactions as Transaction[], priceMap);
  }
}
