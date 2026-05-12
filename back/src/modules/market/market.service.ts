// back/src/modules/market/market.service.ts

import { Injectable, HttpException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CoinResolverService } from './coin-resolver.service';

type CoinGeckoPrice = Record<string, { usd: number; usd_24h_change: number }>;

@Injectable()
export class MarketService implements OnModuleInit {
  private cache = new Map<string, any>();
  private CACHE_TTL = 30_000;

  constructor(
    private config: ConfigService,
    private resolver: CoinResolverService,
  ) {}

  // init resolver // прогрев map из БД
  async onModuleInit() {
    await this.resolver.init();
  }

  // получение рыночных данных // основной endpoint
  async getMarketData(symbols: string[]) {
    const apiKey = this.config.get<string>('COINGECKO_API_KEY');
    const baseUrl = this.config.get<string>('COINGECKO_API_URL');

    // резолвим символы → coinGecko ids
    const resolved = await this.resolver.resolveMany(symbols);

    const ids = resolved.map((c) => c.id).join(',');

    // cache key // защита от спама API
    const cached = this.cache.get(ids);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    try {
      const { data } = await axios.get<CoinGeckoPrice>(
        `${baseUrl}/simple/price`,
        {
          params: {
            ids,
            vs_currencies: 'usd',
            include_24hr_change: true,
          },
          headers: {
            'x-cg-demo-api-key': apiKey,
          },
        },
      );

      const result = resolved.map((r) => ({
        symbol: r.symbol,
        currentPrice: data[r.id]?.usd ?? 0,
        change24h: data[r.id]?.usd_24h_change ?? 0,
      }));

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
