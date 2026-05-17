// back/src/modules/market/market.service.ts

import { Injectable, HttpException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { CoinResolverService } from './coin-resolver.service';
import { RedisService } from '../../redis/redis.service';

import { MarketData, CoinGeckoMarket } from './types/market.types';

@Injectable()
export class MarketService implements OnModuleInit {
  // TTL для Redis cache (120 секунд)
  private readonly CACHE_TTL = 120;

  constructor(
    private config: ConfigService,
    private resolver: CoinResolverService,
    private readonly redis: RedisService,
  ) {}

  // прогрев resolver (символы -> id)
  async onModuleInit() {
    await this.resolver.init();
  }

  // основной endpoint market данных
  async getMarketData(symbols: string[]): Promise<MarketData[]> {
    const apiKey = this.config.get<string>('COINGECKO_API_KEY'); // API key
    const baseUrl = this.config.get<string>('COINGECKO_API_URL'); // base URL

    // символы → CoinGecko ids
    const resolved = await this.resolver.resolveMany(symbols);

    // стабильный ключ кеша (чтобы порядок не влиял)
    const ids = resolved
      .map((c) => c.id)
      .sort()
      .join(',');

    // Redis cache key
    const cacheKey = `market:${ids}`;

    try {
      // 1. проверяем Redis cache
      const cached = await this.redis.get<MarketData[]>(cacheKey);
      if (cached) return cached; // cache hit

      // 2. запрос к CoinGecko
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

      // 3. маппинг ответа в DTO
      const result: MarketData[] = data.map((coin) => ({
        coinId: coin.id,
        symbol: coin.symbol.toUpperCase(),
        currentPrice: coin.current_price ?? 0,
        change24h: coin.price_change_percentage_24h ?? 0,
        image: coin.image,
        rank: coin.market_cap_rank ?? 0,
      }));

      // 4. сохраняем в Redis (TTL 120s)
      await this.redis.set(cacheKey, result, this.CACHE_TTL);

      return result;
    } catch (e) {
      // единая ошибка API
      throw new HttpException('Market fetch failed', 500);
    }
  }
}
