// back/src/modules/portfolio/portfolio.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls'; // <-- Импортируем ClsService
import { PrismaService } from '../../common/prisma/prisma.service';
import { MarketService } from '../market/market.service';
import { calculatePortfolio } from './core/calculatePortfolio';
import type { PortfolioItem } from './types/portfolio.types';
import type { Transaction } from '@prisma/client';

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketService,
    private readonly cls: ClsService, // Инжектируем ClsService
  ) {}

  async getPortfolio(): Promise<PortfolioItem[]> {
    // Получаем userId из CLS контекста (установлен UserContextInterceptor)
    const userId = this.cls.get<string>('userId');

    if (!userId) {
      this.logger.warn('[Portfolio] userId не найден в CLS контексте');
      return [];
    }

    this.logger.debug(`[Portfolio] Запрос портфеля для userId=${userId}`);

    // Явно фильтруем транзакции по userId (дублируем защиту, даже если работает middleware)
    const transactions = await this.prisma.transaction.findMany({
      where: { userId }, // <-- КРИТИЧНО: фильтрация по пользователю
      orderBy: { createdAt: 'asc' },
    });

    if (transactions.length === 0) {
      this.logger.debug(`[Portfolio] Нет транзакций для userId=${userId}`);
      return [];
    }

    const symbols = [...new Set(transactions.map((t) => t.symbol))];
    this.logger.debug(
      `[Portfolio] Запрос рыночных данных для [${symbols.join(', ')}]`,
    );

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

    const result = calculatePortfolio(transactions as Transaction[], priceMap);
    this.logger.log(
      `[Portfolio] Портфель рассчитан для userId=${userId}: ${result.length} активов`,
    );

    return result;
  }
}
