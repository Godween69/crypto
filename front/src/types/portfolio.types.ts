// Базовая модель из бэкенда (агрегация транзакций)
export type PortfolioItem = {
  symbol: string;
  amount: number;
  avgPrice: number;
  invested: number; // Себестоимость текущего остатка
};

// Данные от внешнего API (CoinGecko)
export type MarketData = {
  coinId: string;
  symbol: string;
  currentPrice: number;
  change24h: number;
  image: string;
  rank: number;
  name: string;
};

// UI-модель для главной страницы портфеля
export type PortfolioItemView = PortfolioItem &
  Partial<MarketData> & {
    totalValue?: number;

    // P&L текущего остатка (нереализованный)
    pnl?: number;
    pnlPercent?: number;

    // ✅ Новые поля для консистентности с AssetPosition
    totalInvested?: number; // Всего вложено исторически
    realizedPnl?: number; // Зафиксированная прибыль от продаж
    totalPnl?: number; // Общий P&L (realized + unrealized)
    totalPnlPercent?: number; // Процент от всех вложений

    change24hValue?: number; // Абсолютное изменение за 24ч ($)
  };

export type PortfolioView = PortfolioItemView[];

// Детальная позиция актива (страница транзакций / аналитика)
export type AssetPosition = {
  symbol: string;
  amount: number;
  currentPrice: number;
  totalValue: number;
  invested: number; // Себестоимость текущего остатка
  totalInvested: number; // Всего вложено исторически
  pnl: number; // Нереализованный P&L
  pnlPercent: number;
  realizedPnl: number; // Зафиксированная прибыль/убыток
  totalPnl: number; // Общий P&L (realized + unrealized)
  totalPnlPercent: number; // Процент от всех вложений
  avgBuyPrice?: number;
};
