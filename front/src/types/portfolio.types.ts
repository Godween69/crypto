// front/src/types/portfolio.types.ts

export type PortfolioItem = {
  symbol: string;
  amount: number;
  avgPrice: number;
  invested: number;
};

export type MarketData = {
  symbol: string;
  currentPrice: number;
  change24h: number;
};

// UI-модель (расширенный элемент)
export type PortfolioItemView = PortfolioItem &
  Partial<MarketData> & {
    totalValue?: number;
    pnl?: number;
    pnlPercent?: number;
    change24hValue?: number; //
  };

export type PortfolioView = PortfolioItemView[];

export type AssetPosition = {
  symbol: string;
  amount: number;
  currentPrice: number;
  totalValue: number;
  invested: number;
  pnl: number;
  pnlPercent: number;
  avgBuyPrice?: number; // средняя цена покупки
};
