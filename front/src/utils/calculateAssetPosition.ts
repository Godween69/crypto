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
  //
  const filtered = transactions
    .filter((t) => t.symbol === symbol)
    // Сортировка по времени критична: если продать раньше, чем купить, логика сломается.
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  //  Инициализация аккумуляторов
  let amount = 0;
  let costBasis = 0; // Себестоимость текущего остатка
  let realizedPnl = 0; // Зафиксированная прибыль от продаж
  let totalInvested = 0; // Всего вложено (все BUY)

  for (const t of filtered) {
    if (t.type === "BUY") {
      amount += t.amount;
      costBasis += t.amount * t.price; // Увеличиваем себестоимость остатка
      totalInvested += t.amount * t.price; // Копим исторические вложения
    } else {
      if (amount <= 0) continue; // Защита от продажи в минус

      const sellAmount = Math.min(t.amount, amount); // Нельзя продать больше, чем есть
      const avgPrice = costBasis / amount; // Средняя цена текущего остатка

      // Фиксируем прибыль/убыток по этой продаже
      realizedPnl += (t.price - avgPrice) * sellAmount;

      amount -= sellAmount;
      costBasis -= sellAmount * avgPrice; // Пропорционально уменьшаем себестоимость
    }
  }

  const safeAmount = Math.max(0, amount);
  const safePrice = Math.max(0, currentPrice ?? 0);

  // Средняя цена от ВСЕХ покупок, а не от остатка
  const totalBoughtAmount = filtered
    .filter((t) => t.type === "BUY")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalBoughtCost = filtered
    .filter((t) => t.type === "BUY")
    .reduce((sum, t) => sum + t.amount * t.price, 0);
    
  const avgBuyPrice = totalBoughtAmount > 0 ? totalBoughtCost / totalBoughtAmount : 0;
  const totalValue = safeAmount * safePrice;

  const unrealizedPnl = totalValue - costBasis; // PnL по текущему остатку
  const totalPnl = unrealizedPnl + realizedPnl; // Общий PnL (то, что нужно в UI)

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
