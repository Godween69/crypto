// back/src/modules/portfolio/core/calculatePortfolio.ts

import type { Transaction } from '@prisma/client';
import type { PortfolioItem } from '../types/portfolio.types';

type MarketPriceInfo = {
  currentPrice: number;
  change24h: number;
};

/**
 * Детерминированный расчёт портфеля на бэкенде.
 * Метод: Average Cost Basis + накопление Realized P&L.
 * Все метрики считаются в одном проходе по отсортированным транзакциям.
 */
export function calculatePortfolio(
  transactions: Transaction[],
  marketPrices: Map<string, MarketPriceInfo>,
): PortfolioItem[] {
  // 1. Группируем транзакции по символу
  const txBySymbol = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (!txBySymbol.has(tx.symbol)) txBySymbol.set(tx.symbol, []);
    txBySymbol.get(tx.symbol)!.push(tx);
  }

  const results: PortfolioItem[] = [];

  // 2. Обрабатываем каждый актив независимо
  for (const [symbol, txs] of txBySymbol.entries()) {
    // Строгая хронологическая сортировка
    txs.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    let amount = 0;
    let costBasis = 0; // Себестоимость текущего остатка
    let realizedPnl = 0; // Зафиксированная прибыль/убыток
    let totalBought = 0; // Сумма всех BUY ($)
    let totalSold = 0; // Сумма всех SELL ($)
    let totalBoughtAmount = 0; // Сумма всех BUY (кол-во)

    for (const tx of txs) {
      if (tx.type === 'BUY') {
        const buyCost = tx.amount * tx.price;
        amount += tx.amount;
        costBasis += buyCost;
        totalBought += buyCost;
        totalBoughtAmount += tx.amount;
      } else if (tx.type === 'SELL') {
        // Защита от некорректной истории: продаём не больше, чем есть
        const sellAmount = Math.min(tx.amount, amount);

        if (sellAmount > 0 && amount > 0) {
          const avgPrice = costBasis / amount;
          // Фиксируем PnL по средней цене остатка
          realizedPnl += (tx.price - avgPrice) * sellAmount;

          amount -= sellAmount;
          costBasis -= sellAmount * avgPrice;
          totalSold += sellAmount * tx.price;
        }

        // Позиция закрыта → обнуляем себестоимость
        if (amount <= 0) {
          amount = 0;
          costBasis = 0;
        }
      }
    }

    // 3. Итоговые метрики
    const safeAmount = Math.max(0, amount);
    const marketInfo = marketPrices.get(symbol) || {
      currentPrice: 0,
      change24h: 0,
    };
    const currentPrice = marketInfo.currentPrice;

    const totalValue = safeAmount * currentPrice;
    const unrealizedPnl = totalValue - costBasis;
    const totalPnl = realizedPnl + unrealizedPnl;
    const netInvested = totalBought - totalSold;

    const totalPnlPercent =
      netInvested > 0 ? (totalPnl / netInvested) * 100 : 0;
    const pnlPercent = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;
    const avgBuyPrice =
      totalBoughtAmount > 0 ? totalBought / totalBoughtAmount : 0;

    // Округление до 2 знаков
    const r = (n: number) => Math.round(n * 100) / 100;

    results.push({
      symbol,
      amount: r(safeAmount),
      avgPrice: r(avgBuyPrice),
      invested: r(costBasis),
      currentPrice: r(currentPrice),
      totalValue: r(totalValue),
      change24h: marketInfo.change24h,
      pnl: r(unrealizedPnl),
      pnlPercent: r(pnlPercent),
      realizedPnl: r(realizedPnl),
      totalPnl: r(totalPnl),
      totalPnlPercent: r(totalPnlPercent),
      netInvested: r(netInvested),
      totalInvested: r(totalBought),
    });
  }

  return results;
}
