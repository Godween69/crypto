// front/src/utils/calculateAssetPosition.ts

import type { Transaction } from "../types/transaction.types";
import type { AssetPosition } from "../types/portfolio.types";

/**
 * Рассчитывает позицию актива с использованием средней цены покупки.
 * Формула: avgBuyPrice = сумма покупок / количество купленного
 * PnL считается относительно этой средней цены.
 */
export const calculateAssetPosition = (
  symbol: string,
  transactions: Transaction[],
  currentPrice: number,
): AssetPosition => {
  const filtered = transactions.filter((t) => t.symbol === symbol);

  // Один проход: считаем количество, сумму покупок и сумму продаж
  const { amount, totalBought } = filtered.reduce(
    (acc, t) => {
      const isBuy = t.type === "BUY";
      return {
        amount: acc.amount + (isBuy ? t.amount : -t.amount),
        totalBought: acc.totalBought + (isBuy ? t.amount * t.price : 0),
        totalSold: acc.totalSold + (isBuy ? 0 : t.amount * t.price),
      };
    },
    { amount: 0, totalBought: 0, totalSold: 0 },
  );

  // Средняя цена покупки: только по купленным монетам
  const boughtAmount = filtered
    .filter((t) => t.type === "BUY")
    .reduce((s, t) => s + t.amount, 0);

  const avgBuyPrice = boughtAmount > 0 ? totalBought / boughtAmount : 0;

  // Безопасные значения
  const safePrice = Math.max(0, currentPrice ?? 0);
  const safeAmount = Math.max(0, amount);

  // Финансовые метрики
  const totalValue = safeAmount * safePrice;
  const invested = safeAmount * avgBuyPrice; // ✅ корректные "вложения" в остаток
  const pnl = totalValue - invested;
  const pnlPercent = invested !== 0 ? (pnl / invested) * 100 : 0;

  // Округление до 2 знаков
  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    symbol,
    amount: round(safeAmount),
    currentPrice: round(safePrice),
    totalValue: round(totalValue),
    invested: round(invested),
    pnl: round(pnl),
    pnlPercent: round(pnlPercent),
    avgBuyPrice: round(avgBuyPrice),
  };
};
