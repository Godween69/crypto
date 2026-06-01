// back/src/modules/market/market.service.ts
// Оркестратор: CoinLore (цены) + CoinGecko (картинки) + Redis (кэш)
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../../redis/redis.service';
import { MarketGateway } from './market.gateway';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CoinRepository } from './coin.repository';
import { MarketData } from './types/market.types';
import { CoinloreProvider } from '../../providers/coinlore/coinlore.provider';
import { CoingeckoProvider } from '../../providers/coingecko/coingecko.provider';

@Injectable()
export class MarketService implements OnModuleInit {
  private readonly logger = new Logger(MarketService.name);
  private readonly CACHE_TTL = 300; // 5 минут для цен
  private readonly IMAGE_TTL = 86400 * 30; // 30 дней для картинок
  private refreshPromise: Promise<MarketData[]> | null = null;

  constructor(
    private readonly coinloreProvider: CoinloreProvider,
    private readonly coingeckoProvider: CoingeckoProvider,
    private readonly coinRepository: CoinRepository,
    private readonly redis: RedisService,
    private readonly gateway: MarketGateway,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // При старте проверяем портфель и догружаем картинки для существующих монет
    await this.ensureImagesForPortfolio();
    void this.refreshMarketCache([], 'onModuleInit');
  }

  // Проверка и загрузка картинок для всех монет, которые уже есть в транзакциях
  private async ensureImagesForPortfolio(): Promise<void> {
    try {
      const records = await this.prisma.transaction.findMany({
        select: { symbol: true },
      });
      const symbols = [...new Set(records.map((r) => r.symbol.toUpperCase()))];
      if (symbols.length > 0) await this.ensureImagesForSymbols(symbols);
    } catch (error) {
      this.logger.error(
        `❌ Ошибка ensureImagesForPortfolio: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async getMarketData(
    symbols: string[],
    caller = 'direct',
  ): Promise<MarketData[]> {
    if (symbols.length === 0) return [];
    this.logger.log(
      `📥 getMarketData [${caller}]: запрос для [${symbols.join(', ')}]`,
    );

    const result: MarketData[] = [];
    const missing: string[] = [];

    for (const sym of symbols) {
      const upper = sym.toUpperCase();
      const cached = await this.redis.get<MarketData>(`market:coin:${upper}`);
      if (cached) result.push(cached);
      else missing.push(upper);
    }

    if (missing.length === 0) {
      this.logger.log(
        `✅ getMarketData [${caller}]: cache FULL HIT (${result.length} монет)`,
      );
      return result;
    }

    this.logger.warn(
      `⚠️ getMarketData [${caller}]: cache MISS, догружаем [${missing.join(', ')}]`,
    );
    const fetched = await this.refreshMarketCache(
      missing,
      `getMarketData:${caller}`,
    );
    for (const item of fetched)
      if (missing.includes(item.symbol)) result.push(item);
    return result;
  }

  @Cron('0 * * * *')
  async handleBackgroundPriceUpdate() {
    this.logger.debug('Фоновый cron: обновление цен раз в час...');
    void this.refreshMarketCache([], 'cron:background:1h');
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleWsPriceUpdate() {
    if (!this.gateway.hasActiveClients()) return;
    this.logger.debug('WebSocket cron: обновление цен каждые 5мин...');
    const data = await this.refreshMarketCache([], 'cron:ws:5m');
    if (data.length > 0) {
      for (const item of data)
        await this.redis.set(
          `market:coin:${item.symbol}`,
          item,
          this.CACHE_TTL,
        );
      this.gateway.broadcastUpdate(data, Date.now() + this.CACHE_TTL * 1000);
    }
  }

  private async refreshMarketCache(
    extraSymbols: string[] = [],
    caller = 'unknown',
  ): Promise<MarketData[]> {
    if (this.refreshPromise) {
      this.logger.debug(`[${caller}] Обновление уже выполняется, ожидаем...`);
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const records = await this.prisma.transaction.findMany({
          select: { symbol: true },
        });
        const dbSymbols = [
          ...new Set(records.map((r) => r.symbol.toUpperCase())),
        ];
        const allSymbols = [...new Set([...dbSymbols, ...extraSymbols])].filter(
          Boolean,
        );

        if (allSymbols.length === 0) {
          this.logger.log(`[${caller}] Портфель пуст, пропускаем обновление`);
          return [];
        }

        // ШАГ 0: Убеждаемся, что для всех монет есть картинки (грузим из Gecko, если нет в Redis)
        await this.ensureImagesForSymbols(allSymbols);

        this.logger.log(
          `🚀 [${caller}] Обновление цен для ${allSymbols.join(', ')}...`,
        );
        let allResults: MarketData[] = [];
        let remainingSymbols = [...allSymbols];

        // ШАГ 1: CoinLore (быстрые цены)
        try {
          const loreResults =
            await this.coinloreProvider.fetch(remainingSymbols);
          allResults.push(...loreResults);
          const found = new Set(loreResults.map((r) => r.symbol));
          remainingSymbols = remainingSymbols.filter((s) => !found.has(s));
          if (loreResults.length > 0)
            this.logger.log(`✅ CoinLore вернул ${loreResults.length} монет`);
        } catch (error) {
          this.logger.warn(
            `CoinLore ошибка: ${error instanceof Error ? error.message : 'unknown'}`,
          );
        }

        // ШАГ 2: CoinGecko (фоллбэк для цен, если Lore не нашел)
        if (remainingSymbols.length > 0) {
          try {
            const geckoResults =
              await this.coingeckoProvider.fetch(remainingSymbols);
            allResults.push(...geckoResults);
            if (geckoResults.length > 0)
              this.logger.log(
                `✅ CoinGecko вернул ${geckoResults.length} монет`,
              );
          } catch (error) {
            this.logger.warn(
              `CoinGecko ошибка: ${error instanceof Error ? error.message : 'unknown'}`,
            );
          }
        }

        // Обогащаем цены картинками из Redis
        for (const item of allResults) {
          const imageUrl = await this.redis.get<string>(
            `market:image:${item.symbol}`,
          );
          if (imageUrl) item.image = imageUrl;
        }

        // Кэшируем финальные данные
        for (const item of allResults) {
          await this.redis.set(
            `market:coin:${item.symbol}`,
            item,
            this.CACHE_TTL,
          );
        }

        this.logger.log(
          `✅ [${caller}] Итого обновлено ${allResults.length} монет.`,
        );
        return allResults;
      } catch (err) {
        if (err instanceof Error)
          this.logger.error(`[${caller}] Критическая ошибка: ${err.message}`);
        return [];
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // Проверка Redis и догрузка картинок через CoinGecko для новых монет
  private async ensureImagesForSymbols(symbols: string[]): Promise<void> {
    const missing: string[] = [];
    for (const sym of symbols) {
      const cachedImage = await this.redis.get<string>(`market:image:${sym}`);
      if (!cachedImage) missing.push(sym);
    }
    if (missing.length === 0) return;

    this.logger.log(
      `🖼️ Догрузка картинок из CoinGecko для ${missing.join(', ')}...`,
    );
    await this.coingeckoProvider.loadMetadata(missing);

    // Сохраняем в Redis и БД (geckoId)
    for (const sym of missing) {
      const meta = this.coingeckoProvider.getMetadata(sym);
      if (meta) {
        await this.redis.set(`market:image:${sym}`, meta.image, this.IMAGE_TTL);
        await this.coinRepository.upsert(sym, meta.geckoId, meta.geckoId); // сохраняем geckoId в БД
      }
    }
  }
}
