// back/src/modules/portfolio/types/portfolio.types.ts

export type PortfolioItem = {
  symbol: string;
  amount: number; // Текущий остаток монет
  avgPrice: number; // Средняя цена покупки (историческая)
  invested: number; // Себестоимость текущего остатка (costBasis)

  currentPrice: number; // Актуальная рыночная цена
  totalValue: number; // Текущая рыночная стоимость остатка
  change24h: number; // Изменение цены за 24ч (%)

  pnl: number; // Нереализованный PnL (бумажный)
  pnlPercent: number; // % нереализованного PnL от costBasis
  realizedPnl: number; // Реализованный PnL (зафиксированный)
  totalPnl: number; // Общий PnL (realized + unrealized)
  totalPnlPercent: number; // Общий ROI % от netInvested

  netInvested: number; // Реально заведённый капитал (BUY - SELL)
  totalInvested: number; // Историческая сумма всех покупок
};
