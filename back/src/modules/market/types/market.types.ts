export type MarketData = {
  symbol: string;
  currentPrice: number;
  change24h: number;
};

// Результат валидации символа
export type VerifySymbolResult = {
  valid: boolean;
  symbol: string;
  name?: string;
  current_price?: number;
  change_24h?: number;
  message?: string;
};
