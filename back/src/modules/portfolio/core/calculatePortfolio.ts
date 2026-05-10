import type { Transaction } from '../../transaction/types/transaction.types';
import type { PortfolioItem } from '../types/portfolio.types';

export function calculatePortfolio(
  transactions: Transaction[],
): PortfolioItem[] {
  const map = new Map<
    string,
    {
      amount: number;
      totalCost: number;
    }
  >();

  for (const tx of transactions) {
    const current = map.get(tx.symbol) || {
      amount: 0,
      totalCost: 0,
    };

    if (tx.type === 'BUY') {
      current.amount += tx.amount;
      current.totalCost += tx.amount * tx.price;
    }

    if (tx.type === 'SELL') {
      current.amount -= tx.amount;
      current.totalCost -= tx.amount * tx.price;
    }

    map.set(tx.symbol, current);
  }

  return Array.from(map.entries()).map(([symbol, data]) => ({
    symbol,
    amount: data.amount,
    avgPrice: data.amount ? data.totalCost / data.amount : 0,
    invested: data.totalCost,
  }));
}
