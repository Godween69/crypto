import type { Transaction } from "../types/transaction.types";
import type { AssetPosition } from "../types/portfolio.types";

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Рассчитывает позицию с учётом реализованной и нереализованной прибыли.
 * Метод: Average Cost Basis + накопление Realized P&L
 */
export const calculateAssetPosition = (
  symbol: string,
  transactions: Transaction[],
  currentPrice: number,
): AssetPosition => {
  const filtered = transactions
    .filter((t) => t.symbol === symbol)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  let amount = 0;
  let costBasis = 0; // Себестоимость текущего остатка
  let realizedPnl = 0; // Зафиксированная прибыль от продаж
  let totalInvested = 0; // Всего вложено исторически (все BUY)

  for (const t of filtered) {
    if (t.type === "BUY") {
      amount += t.amount;
      costBasis += t.amount * t.price;
      totalInvested += t.amount * t.price;
    } else {
      if (amount <= 0) continue;

      const sellAmount = Math.min(t.amount, amount);
      const avgPrice = costBasis / amount;

      // ✅ Фиксируем прибыль/убыток по этой продаже
      realizedPnl += (t.price - avgPrice) * sellAmount;

      amount -= sellAmount;
      costBasis -= sellAmount * avgPrice;
    }
  }

  const safeAmount = Math.max(0, amount);
  const safePrice = Math.max(0, currentPrice ?? 0);

  const avgBuyPrice = safeAmount > 0 ? costBasis / safeAmount : 0;
  const totalValue = safeAmount * safePrice;

  const unrealizedPnl = totalValue - costBasis;
  const totalPnl = unrealizedPnl + realizedPnl;

  // Процент считаем от исторических вложений, чтобы не ломался при закрытии позиции
  const totalPnlPercent =
    totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const unrealizedPnlPercent =
    costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

  return {
    symbol,
    amount: round(safeAmount),
    currentPrice: round(safePrice),
    totalValue: round(totalValue),
    invested: round(costBasis), // Себестоимость остатка
    totalInvested: round(totalInvested), // Всего вложено за всё время
    pnl: round(unrealizedPnl), // Нереализованный
    pnlPercent: round(unrealizedPnlPercent),
    realizedPnl: round(realizedPnl), // Реализованный
    totalPnl: round(totalPnl), // Общий (то, что нужно в UI)
    totalPnlPercent: round(totalPnlPercent),
    avgBuyPrice: round(avgBuyPrice),
  };
};
