// back/src/modules/market/types/market.types.ts

export type MarketData = {
  coinId: string; // CoinGecko id
  symbol: string; // тикер

  currentPrice: number; // текущая цена
  change24h: number; // изменение за 24ч

  image: string; // иконка монеты
  rank: number; // market cap rank
};

// CoinGecko API response type
export type CoinGeckoMarket = {
  id: string;
  symbol: string;

  current_price: number;
  price_change_percentage_24h: number;

  image: string;
  market_cap_rank: number;
}[];
