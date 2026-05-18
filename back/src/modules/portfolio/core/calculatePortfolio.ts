// back/src/modules/portfolio/core/calculatePortfolio.ts

import type { Transaction } from '../../transaction/types/transaction.types';
import type { PortfolioItem } from '../types/portfolio.types';

export function calculatePortfolio(
  transactions: Transaction[],
): PortfolioItem[] {
  // symbol -> aggregated position
  const map = new Map<
    string,
    {
      amount: number;
      totalCost: number;
    }
  >();

  for (const tx of transactions) {
    // текущее состояние позиции
    const current = map.get(tx.symbol) || {
      amount: 0,
      totalCost: 0,
    };

    // ─────────────────────────────────────────────────────────
    // BUY
    // увеличиваем:
    // - количество монет
    // - общий cost basis позиции
    // ─────────────────────────────────────────────────────────
    if (tx.type === 'BUY') {
      current.amount += tx.amount;
      current.totalCost += tx.amount * tx.price;
    }

    // ─────────────────────────────────────────────────────────
    // SELL
    // уменьшаем:
    // - количество монет
    // - cost basis по средней цене покупки
    //
    // ВАЖНО:
    // нельзя вычитать по цене продажи,
    // иначе ломается avgPrice
    // ─────────────────────────────────────────────────────────
    if (tx.type === 'SELL') {
      // средняя цена позиции ДО продажи
      const avgPrice =
        current.amount > 0
          ? current.totalCost / current.amount
          : 0;

      current.amount -= tx.amount;

      // уменьшаем cost basis
      current.totalCost -= tx.amount * avgPrice;
    }

    map.set(tx.symbol, current);
  }

  // ─────────────────────────────────────────────────────────
  // финальное преобразование Map -> PortfolioItem[]
  // ─────────────────────────────────────────────────────────
  return Array.from(map.entries()).map(([symbol, data]) => ({
    symbol,

    // сколько монет осталось
    amount: data.amount,

    // средняя цена оставшейся позиции
    avgPrice:
      data.amount > 0
        ? data.totalCost / data.amount
        : 0,

    // сколько денег сейчас "вложено" в открытую позицию
    invested: data.totalCost,
  }));
}