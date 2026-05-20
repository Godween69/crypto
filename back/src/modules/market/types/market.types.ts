// Внутренний DTO для рыночных данных
export type MarketData = {
  coinId: string; // CoinGecko id
  symbol: string; // тикер (BTC, ETH...)
  currentPrice: number; // текущая цена в USD
  change24h: number; // изменение за 24ч в %
  image: string; // URL иконки
  rank: number | null; // market cap rank
};

// Сырой ответ CoinGecko API (для маппинга)
export type CoinGeckoMarket = {
  id: string;
  symbol: string;
  current_price: number | null;
  price_change_percentage_24h: number | null;
  image: string;
  market_cap_rank: number | null;
}[];
