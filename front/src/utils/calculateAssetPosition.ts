// front/src/utils/calculateAssetPosition.ts
import type { Transaction } from "../types/transaction.types";
import type { AssetPosition } from "../types/portfolio.types";

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Рассчитывает позицию с учётом реализованной и нереализованной прибыли.
 * Метод: Average Cost Basis + накопление Realized P&L
 *
 * 🔥 FIX: Убрана защита Math.min(t.amount, amount), которая создавала расхождение
 * с простым суммированием в списке портфеля. Теперь баланс может уходить в минус
 * (short-selling), что позволяет детектировать ошибочные транзакции.
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
      // 🔥 FIX: Убрана защита от продажи в минус. Теперь amount может стать отрицательным,
      // что точно повторяет логику простого суммирования в списке портфеля.
      // Если amount <= 0 перед продажей, это означает short-selling с нулевой позиции.
      const sellAmount = t.amount;

      if (amount > 0) {
        // Нормальная продажа: фиксируем P&L по средней цене
        const avgPrice = costBasis / amount;
        const actualSellAmount = Math.min(sellAmount, amount);
        realizedPnl += (t.price - avgPrice) * actualSellAmount;

        // Если продаём больше, чем есть (short-selling)
        if (sellAmount > amount) {
          const shortAmount = sellAmount - amount;
          // Short-selling: себестоимость обнуляется, баланс уходит в минус
          amount = -shortAmount;
          costBasis = 0;
        } else {
          amount -= sellAmount;
          costBasis -= sellAmount * avgPrice;
        }
      } else {
        // Продажа при нулевом или отрицательном балансе (deep short-selling)
        amount -= sellAmount;
        // costBasis остаётся 0, так как позиции нет
      }
    }
  }

  // 🔥 FIX: safeAmount теперь корректно отражает реальный баланс (может быть 0 или отрицательным)
  // Для отображения в UI используем Math.max(0, amount), чтобы не показывать отрицательные значения
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
