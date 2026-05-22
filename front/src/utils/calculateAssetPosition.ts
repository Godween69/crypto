// front/src/utils/calculateAssetPosition.ts
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
    ); // хронологический порядок

  let amount = 0;
  let costBasis = 0; // себестоимость текущего остатка
  let realizedPnl = 0; // зафиксированная прибыль от продаж
  let totalInvested = 0; // исторические вложения (все BUY)

  for (const t of filtered) {
    if (t.type === "BUY") {
      amount += t.amount;
      costBasis += t.amount * t.price;
      totalInvested += t.amount * t.price;
    } else {
      if (amount <= 0) continue; // защита от продажи в минус
      const sellAmount = Math.min(t.amount, amount);
      const avgPrice = costBasis / amount;
      realizedPnl += (t.price - avgPrice) * sellAmount; // фиксируем прибыль/убыток
      amount -= sellAmount;
      costBasis -= sellAmount * avgPrice; // пропорционально уменьшаем себестоимость
    }
  }

  const safeAmount = Math.max(0, amount);
  const safePrice = Math.max(0, currentPrice ?? 0);
  const totalValue = safeAmount * safePrice;
  const unrealizedPnl = totalValue - costBasis; // PnL по текущему остатку
  const totalPnl = unrealizedPnl + realizedPnl; // общий PnL для UI

  // исторические данные для расчёта средней цены и процентов
  const totalBoughtAmount = filtered
    .filter((t) => t.type === "BUY")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalBoughtCost = filtered
    .filter((t) => t.type === "BUY")
    .reduce((sum, t) => sum + t.amount * t.price, 0);
  const avgBuyPrice =
    totalBoughtAmount > 0 ? totalBoughtCost / totalBoughtAmount : 0;

  // процент считаем от исторических вложений, чтобы метрика не ломалась при закрытии
  const totalPnlPercent =
    totalBoughtCost > 0 ? (totalPnl / totalBoughtCost) * 100 : 0;
  const unrealizedPnlPercent =
    costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

  return {
    symbol,
    amount: round(safeAmount),
    currentPrice: round(safePrice),
    totalValue: round(totalValue),
    invested: round(costBasis), // себестоимость текущего остатка
    totalInvested: round(totalInvested), // всего вложено за всё время
    pnl: round(unrealizedPnl), // нереализованный
    pnlPercent: round(unrealizedPnlPercent),
    realizedPnl: round(realizedPnl), // реализованный
    totalPnl: round(totalPnl), // общий (главный показатель)
    totalPnlPercent: round(totalPnlPercent),
    avgBuyPrice: round(avgBuyPrice),
  };
};
