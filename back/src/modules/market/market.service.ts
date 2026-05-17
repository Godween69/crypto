import {
  Injectable,
  HttpException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { CoinResolverService } from './coin-resolver.service';
import { RedisService } from '../../redis/redis.service';

import { MarketData, CoinGeckoMarket } from './types/market.types';

@Injectable()
export class MarketService implements OnModuleInit {
  private readonly logger = new Logger(MarketService.name);

  // TTL для Redis cache (300 секунд)
  // market данные считаются "свежими" 5 минуты
  private readonly CACHE_TTL = 300;

  constructor(
    private config: ConfigService,
    private resolver: CoinResolverService, // symbol -> geckoId resolver
    private readonly redis: RedisService,
  ) {}

  // вызывается при старте модуля
  async onModuleInit() {
    // прогреваем resolver:
    // загружаем symbol → geckoId mapping в память
    await this.resolver.init();
  }

  // Метод получения market data
  async getMarketData(symbols: string[]): Promise<MarketData[]> {
    const apiKey = this.config.get<string>('COINGECKO_API_KEY');
    const baseUrl = this.config.get<string>('COINGECKO_API_URL');

    // 1. РЕЗОЛВИНГ СИМВОЛОВ В COINGECKO IDS
    // BTC → bitcoin ETH → ethereum
    // это нужно, потому что CoinGecko работает только с ids
    const resolved = await this.resolver.resolveMany(symbols);

    // 2. ДЕЛАЕМ СТАБИЛЬНЫЙ CACHE KEY
    // сортируем, чтобы порядок не влиял:
    // BTC,ETH == ETH,BTC
    const ids = resolved
      .map((c) => c.id)
      .sort()
      .join(',');

    const cacheKey = `market:${ids}`;

    try {
      // 3. REDIS (быстрый ответ 1-2ms)
      const cached = await this.redis.get<MarketData[]>(cacheKey);

      if (cached) return cached; // Если есть -> мгновенный ответ, нет -> идем дальше

      // 4. ВНЕШНИЙ API (CoinGecko fallback)
      const { data } = await axios.get<CoinGeckoMarket>(
        `${baseUrl}/coins/markets`,
        {
          params: {
            ids, // comma-separated coin ids
            vs_currency: 'usd',
            price_change_percentage: '24h',
          },
          headers: {
            'x-cg-demo-api-key': apiKey,
          },
          timeout: 5000, // защита от зависших запросов
        },
      );

      // 5. НОРМАЛИЗАЦИЯ (DTO mapping)
      // превращаем сырой CoinGecko ответ в наш формат
      const result: MarketData[] = data.map((coin) => ({
        coinId: coin.id,
        symbol: coin.symbol.toUpperCase(),
        currentPrice: coin.current_price ?? 0,
        change24h: coin.price_change_percentage_24h ?? 0,
        image: coin.image,

        // market_cap_rank может быть null -> оставляем null
        rank: coin.market_cap_rank ?? null,
      }));

      // 6. КЛАДЕМ В REDIS (TTL = 300s)
      await this.redis.set(cacheKey, result, this.CACHE_TTL);

      return result;
    } catch (e) {
      // единая точка ошибки
      this.logger.error('Market fetch failed', e);

      throw new HttpException('Market fetch failed', 500);
    }
  }
}
