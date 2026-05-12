// back/src/modules/market/market.service.ts

import { Injectable, HttpException, OnModuleInit } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import axios from 'axios';

import { CoinResolverService } from './coin-resolver.service';

import { MarketData } from './types/market.types';

type CoinGeckoMarket = {
  id: string;
  symbol: string;

  current_price: number;
  price_change_percentage_24h: number;

  image: string;
  market_cap_rank: number;
}[];

@Injectable()
export class MarketService implements OnModuleInit {
  // memory cache market data
  private cache = new Map<
    string,
    {
      data: MarketData[];
      expires: number;
    }
  >();

  // ttl cache 30 сек
  private readonly CACHE_TTL = 30_000;

  constructor(
    private config: ConfigService,
    private resolver: CoinResolverService,
  ) {}

  // прогрев resolver cache
  async onModuleInit() {
    await this.resolver.init();
  }

  // основной market endpoint
  async getMarketData(symbols: string[]): Promise<MarketData[]> {
    const apiKey = this.config.get<string>('COINGECKO_API_KEY');

    const baseUrl = this.config.get<string>('COINGECKO_API_URL');

    // resolve symbols -> gecko ids
    const resolved = await this.resolver.resolveMany(symbols);

    // stable ids key
    const ids = resolved
      .map((c) => c.id)
      .sort()
      .join(',');

    // memory cache hit
    const cached = this.cache.get(ids);

    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    try {
      // CoinGecko markets endpoint
      const { data } = await axios.get<CoinGeckoMarket>(
        `${baseUrl}/coins/markets`,
        {
          params: {
            ids,
            vs_currency: 'usd',
            price_change_percentage: '24h',
          },

          headers: {
            'x-cg-demo-api-key': apiKey,
          },
        },
      );

      // dto mapping
      const result: MarketData[] = data.map((coin) => ({
        coinId: coin.id,

        symbol: coin.symbol.toUpperCase(),

        currentPrice: coin.current_price ?? 0,

        change24h: coin.price_change_percentage_24h ?? 0,

        image: coin.image,

        rank: coin.market_cap_rank ?? 0,
      }));

      // save cache
      this.cache.set(ids, {
        data: result,
        expires: Date.now() + this.CACHE_TTL,
      });

      return result;
    } catch (e) {
      throw new HttpException('Market fetch failed', 500);
    }
  }
}
