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

  // Promise-lock заменяет boolean-флаг. Гарантирует, что при парралельных запросах все вызовы будут ждать один и тот же fetch, а не создавать три параллельных.
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

  // 🔥 ОСНОВНОЙ МЕТОД: Получение данных с гарантией наличия кэша
  // Используется фронтендом (MarketController) и внутренними сервисами (PortfolioSnapshotService)
  // 🔥 ДВУХУРОВНЕВОЕ КЭШИРОВАНИЕ: сначала индивидуальные ключи, потом общий
  async getMarketData(
    symbols: string[],
    caller = 'direct',
  ): Promise<MarketData[]> {
    this.logger.log(`📥 getMarketData [${caller}]: запрос для [${symbols}]`);

    const resolved = await this.resolver.resolveMany(symbols);
    const requestedUpper = resolved.map((c) => c.symbol.toUpperCase());

    // === УРОВЕНЬ 1: Проверяем индивидуальные кэши для каждой монеты ===
    const individualResults: MarketData[] = [];
    const missingCoins: { symbol: string; geckoId: string }[] = [];

    for (const coin of resolved) {
      const singleKey = `market:single:${coin.id}`;
      const cached = await this.redis.get<MarketData>(singleKey);
      if (cached) {
        individualResults.push(cached);
      } else {
        missingCoins.push({ symbol: coin.symbol, geckoId: coin.id });
      }
    }

    // Если все монеты найдены в индивидуальных кэшах — возвращаем без запроса к API
    if (missingCoins.length === 0) {
      this.logger.log(
        `✅ getMarketData [${caller}]: cache HIT из индивидуальных кэшей (${individualResults.length} монет)`,
      );
      // Фильтруем только запрошенные символы (на случай если в кэше были лишние)
      return individualResults.filter((d) => requestedUpper.includes(d.symbol));
    }

    // === УРОВЕНЬ 2: Если есть пропуски — обновляем кэш через API ===
    this.logger.warn(
      `⚠️ getMarketData [${caller}]: cache MISS для [${missingCoins.map((c) => c.geckoId).join(',')}], запуск refreshMarketCache`,
    );

    const allData = await this.refreshMarketCache(
      symbols,
      `getMarketData:${caller}`,
    );

    // Возвращаем только запрошенные символы
    return allData.filter((d) => requestedUpper.includes(d.symbol));
  }

  // 🔥 ФОНОВЫЙ КРОН: Обновляет кэш цен ВСЕГДА (раз в 60 минут)
  // Это гарантирует, что график не будет прямой линией, даже если никто не заходит на сайт неделями.
  @Cron('0 * * * *') // В каждый 0-ю минуту каждого часа
  async handleBackgroundPriceUpdate() {
    this.logger.debug('Фоновый cron: обновление рыночных данных раз в час...');
    await this.refreshMarketCache([], 'cron:background:1h');
  }

  // 🔥 WS-КРОН: Обновляет кэш и шлет данные клиентам (каждые 5 минут)
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleWsPriceUpdate() {
    if (!this.gateway.hasActiveClients()) {
      // Если нет клиентов, пропускаем broadcast, фоновый крон всё равно обновит Redis
      return;
    }

    this.logger.debug(
      'WebSocket cron: обновление рыночных данных каждые 5мин (есть активные подключения)...',
    );
    const data = await this.refreshMarketCache([], 'cron:ws:5m');

    // Если данные получены успешно, шлем их в сокет
    if (data.length > 0) {
      const expiresAt = Date.now() + this.CACHE_TTL * 1000;
      this.gateway.broadcastUpdate(data, expiresAt);
    }
  }

  // Универсальный метод обновления кэша
  // 🔥 extraSymbols — символы из запроса клиента сверх тех, что в БД
  private async refreshMarketCache(
    extraSymbols: string[] = [],
    caller = 'unknown',
  ): Promise<MarketData[]> {
    // Если обновление уже запущено, возвращаем существующий Promise
    if (this.refreshPromise) {
      this.logger.debug(
        `[${caller}] Обновление уже выполняется, ожидаем завершение...`,
      );
      return this.refreshPromise;
    }

    // Создаём Promise и сразу сохраняем его в переменную (sync-присваивание предотвращает race condition)
    this.refreshPromise = (async () => {
      try {
        const records = await this.prisma.transaction.findMany({
          select: { symbol: true },
        });
        const dbSymbols = [...new Set(records.map((r) => r.symbol))];
        // объединяем символы из БД с запрошенными через extraSymbols
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
          `🚀 [${caller}] Начало обновления API для ${uniqueSymbols}...`,
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

        // 🔥 ДВУХУРОВНЕВОЕ СОХРАНЕНИЕ:
        // 1. Каждая монета отдельно под ключом market:single:{geckoId}
        //    → решает проблему cache MISS при запросе одиночных монет
        // 2. Общий ключ market:{sorted_ids} для совместимости
        const singleCacheOps: Promise<void>[] = [];
        for (const item of result) {
          singleCacheOps.push(
            this.redis.set(
              `market:single:${item.coinId}`,
              item,
              this.CACHE_TTL,
            ),
          );
        }
        await Promise.all(singleCacheOps);
        await this.redis.set(`market:${ids}`, result, this.CACHE_TTL);

        this.logger.log(
          `✅ [${caller}] Рыночные данные успешно обновлены и сохранены в Redis (${result.length} монет: ${result.length} индивидуальных + 1 общий кэш).`,
        );
        return result;
      } catch (e) {
        this.logger.error(`[${caller}] Ошибка обновления рыночных данных`, e);
        return [];
      } finally {
        // Сбрасываем лок после завершения (успех или ошибка)
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }
}
