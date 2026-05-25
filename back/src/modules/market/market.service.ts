// back\src\modules\market\market.service.ts

/*
1. Сервер стартует
2. onModuleInit() → загрузка маппинга символов → первый запрос к API
3. Клиент запрашивает /api/market?symbols=BTC,ETH
4. getMarketData() → проверка Redis
   ├── Есть в кэше → мгновенный ответ
   └── Нет в кэше → refreshMarketCache() (с Promise-lock)
5. Cron каждые 5 минут:
   └── Если есть WS клиенты → обновить кэш и разослать
6. Cron каждый час:
   └── Всегда обновлять кэш для графика динамики портфеля (даже если нет клиентов) 
   */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { CoinResolverService } from './coin-resolver.service';
import { RedisService } from '../../redis/redis.service';
import { MarketGateway } from './market.gateway';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MarketData, CoinGeckoMarket } from './types/market.types';

@Injectable()
export class MarketService implements OnModuleInit {
  private readonly logger = new Logger(MarketService.name);
  private readonly CACHE_TTL = 300; // 5 минут жизни кэша

  private refreshPromise: Promise<MarketData[]> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly resolver: CoinResolverService,
    private readonly redis: RedisService,
    private readonly gateway: MarketGateway,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.resolver.init();
    await this.refreshMarketCache([], 'onModuleInit');
  }

  async getMarketData(
    symbols: string[],
    caller = 'direct',
  ): Promise<MarketData[]> {
    if (symbols.length === 0) return [];

    this.logger.log(
      `📥 getMarketData [${caller}]: запрос для [${symbols.join(', ')}]`,
    );

    const resolved = await this.resolver.resolveMany(symbols);
    const result: MarketData[] = [];
    const missing: { symbol: string; geckoId: string }[] = [];

    // Шаг 1: проверяем single-кэш для каждой монеты
    for (const coin of resolved) {
      const singleKey = `market:coin:${coin.symbol}`;
      const cached = await this.redis.get<MarketData>(singleKey);
      if (cached) {
        result.push(cached);
      } else {
        missing.push({ symbol: coin.symbol, geckoId: coin.id });
      }
    }

    if (missing.length === 0) {
      this.logger.log(
        `✅ getMarketData [${caller}]: cache FULL HIT (${result.length} монет)`,
      );
      return result;
    }

    this.logger.warn(
      `⚠️ getMarketData [${caller}]: cache partial MISS, догружаем [${missing.map((m) => m.symbol).join(', ')}]`,
    );

    // 🔥 FIX: Если refreshMarketCache вернет пустой массив из-за ошибки API,
    // мы не должны добавлять пустоту в результат. Мы вернем только то, что было в кэше.
    const fetched = await this.refreshMarketCache(
      missing.map((m) => m.symbol),
      `getMarketData:${caller}`,
    );

    for (const item of fetched) {
      await this.redis.set(`market:coin:${item.symbol}`, item, this.CACHE_TTL);
      if (missing.some((m) => m.symbol === item.symbol)) {
        result.push(item);
      }
    }

    return result;
  }

  @Cron('0 * * * *')
  async handleBackgroundPriceUpdate() {
    this.logger.debug('Фоновый cron: обновление рыночных данных раз в час...');
    await this.refreshMarketCache([], 'cron:background:1h');
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleWsPriceUpdate() {
    if (!this.gateway.hasActiveClients()) return;

    this.logger.debug(
      'WebSocket cron: обновление рыночных данных каждые 5мин...',
    );
    const data = await this.refreshMarketCache([], 'cron:ws:5m');
    if (data.length > 0) {
      for (const item of data) {
        await this.redis.set(
          `market:coin:${item.symbol}`,
          item,
          this.CACHE_TTL,
        );
      }
      const expiresAt = Date.now() + this.CACHE_TTL * 1000;
      this.gateway.broadcastUpdate(data, expiresAt);
    } else {
      this.logger.warn(
        '❌ [cron:ws:5m] Данные не получены (ошибка API или пустой ответ). Broadcast пропущен.',
      );
    }
  }

  private async refreshMarketCache(
    extraSymbols: string[] = [],
    caller = 'unknown',
  ): Promise<MarketData[]> {
    if (this.refreshPromise) {
      this.logger.debug(
        `[${caller}] Обновление уже выполняется, ожидаем завершение...`,
      );
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const records = await this.prisma.transaction.findMany({
          select: { symbol: true },
        });
        const dbSymbols = [...new Set(records.map((r) => r.symbol))];
        const uniqueSymbols = [
          ...new Set([...dbSymbols, ...extraSymbols]),
        ].filter(Boolean);

        if (uniqueSymbols.length === 0) {
          this.logger.log(`[${caller}] Портфель пуст, пропускаем обновление`);
          return [];
        }

        const resolved = await this.resolver.resolveMany(uniqueSymbols);
        const ids = resolved
          .map((c) => c.id)
          .sort()
          .join(',');
        const apiKey = this.config.get<string>('COINGECKO_API_KEY');
        const baseUrl = this.config.get<string>('COINGECKO_API_URL');

        this.logger.log(
          `🚀 [${caller}] Начало обновления API для ${uniqueSymbols.join(', ')}...`,
        );

        const { data } = await axios.get<CoinGeckoMarket>(
          `${baseUrl}/coins/markets`,
          {
            params: { ids, vs_currency: 'usd', price_change_percentage: '24h' },
            headers: { 'x-cg-demo-api-key': apiKey },
            timeout: 5000,
          },
        );

        const result: MarketData[] = data.map((coin) => ({
          coinId: coin.id,
          symbol: coin.symbol.toUpperCase(),
          currentPrice: coin.current_price ?? 0,
          change24h: coin.price_change_percentage_24h ?? 0,
          image: coin.image,
          rank: coin.market_cap_rank ?? null,
        }));

        // 🔥 FIX: Сохраняем в Redis только если получили данные
        for (const item of result) {
          await this.redis.set(
            `market:coin:${item.symbol}`,
            item,
            this.CACHE_TTL,
          );
        }

        this.logger.log(
          `✅ [${caller}] Рыночные данные обновлены (${result.length} монет).`,
        );
        return result;
      } catch (err) {
        if (err instanceof Error) {
          this.logger.error(
            `[${caller}] Ошибка обновления рыночных данных: ${err.message}`,
          );
        }
        // 🔥 ВАЖНО: Возвращаем пустой массив, но НЕ очищаем старый кэш в Redis.
        // Старые данные останутся жить до истечения TTL, что лучше, чем ничего.
        return [];
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }
}
