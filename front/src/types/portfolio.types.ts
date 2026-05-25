// front/src/types/portfolio.types.ts

export type MarketData = {
  coinId: string;
  symbol: string;
  currentPrice: number;
  change24h: number;
  image: string;
  rank: number;
  name: string;
};

// Полная синхронизация с бэкенд-DTO
export type PortfolioItem = {
  symbol: string;
  amount: number;
  avgPrice: number;             
  invested: number;
  currentPrice: number;
  totalValue: number;
  change24h: number;
  pnl: number;
  pnlPercent: number;
  realizedPnl: number;
  totalPnl: number;
  totalPnlPercent: number;
  netInvested: number;
  totalInvested: number;
  
  // UI-поля (опционально, обогащаются на фронте или бэкенде)
  name?: string;
  image?: string;
  rank?: number;
  coinId?: string;
};
