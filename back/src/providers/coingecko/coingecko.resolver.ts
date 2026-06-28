// back/src/providers/coingecko/coingecko.resolver.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

import { CoinRepository } from '../../modules/market/coin.repository';
import { RedisService } from '../../redis/redis.service';

// ==========================================
// ТИПЫ
// ==========================================

// Ответ CoinGecko /search
type CoinGeckoSearch = {
  coins: {
    id: string;
    symbol: string;
    name: string;
    market_cap_rank: number | null;
    thumb: string;
    large: string;
  }[];
};

// Результат резолвинга: geckoId + image URL
export type ResolvedCoin = {
  symbol: string;
  id: string;
  image?: string;
};

// ==========================================
// КОНСТАНТЫ
// ==========================================

// TTL для кэширования "монеты нет" (защита от спама API при опечатках)
const NOT_FOUND_TTL = 300; // 5 минут
const NOT_FOUND_MARKER = '__NOT_FOUND__';

// TTL для image URL в Redis (30 дней)
const IMAGE_TTL = 60 * 60 * 24 * 30;

// TTL для geckoId в Redis (24 часа)
const GECKO_ID_TTL = 60 * 60 * 24;

// Максимальное количество retry при rate limit (429)
const MAX_RETRIES = 3;

// Базовая задержка для exponential backoff (5 секунд)
const BASE_RETRY_DELAY_MS = 5000;

// Лимит market cap rank для фильтрации скам-токенов
const RANK_LIMIT = 2000;

// ==========================================
// РЕЗОЛВЕР
// ==========================================

@Injectable()
export class CoingeckoResolver implements OnModuleInit {
  private readonly logger = new Logger(CoingeckoResolver.name);

  // In-memory кэш: symbol → { id, image }
  private readonly memoryCache = new Map<string, { id: string; image?: string }>();

  // In-memory кэш "не найдено": symbol → timestamp
  private readonly notFoundCache = new Map<string, number>();

  constructor(
    private readonly repo: CoinRepository,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) { }

  // ─────────────────────────────────────────────────────────────
  // ПРОГРЕВ КЭША ПРИ СТАРТЕ
  // ─────────────────────────────────────────────────────────────

  async onModuleInit() {
    const coins = await this.repo.findAll();
    for (const coin of coins) {
      this.memoryCache.set(coin.symbol.toUpperCase(), {
        id: coin.geckoId,
        image: undefined, // image загрузится из Redis при первом запросе
      });
    }
    this.logger.log(
      `[CoinGecko:Resolver] Прогрет кэш: ${coins.length} монет из БД`,
    );
  }

  // ─────────────────────────────────────────────────────────────
  // ЕДИНЫЙ МЕТОД РЕЗОЛВИНГА
  // ─────────────────────────────────────────────────────────────

  /**
   * Резолвит symbol → { geckoId, image }
   *
   * Поток данных (4 уровня кэша):
   * 1. Memory cache (0ms) — самый быстрый
   * 2. Redis cache (1-2ms) — shared между инстансами
   * 3. PostgreSQL (1-5ms) — надёжный якорь
   * 4. CoinGecko API (800ms+) — последний шанс
   */
  async resolve(symbol: string): Promise<ResolvedCoin> {
    const key = symbol.toUpperCase();

    // ✅ ПРОВЕРКА 1: "Не найдено" в памяти (защита от спама)
    const notFoundAt = this.notFoundCache.get(key);
    if (notFoundAt && Date.now() - notFoundAt < NOT_FOUND_TTL * 1000) {
      throw new Error(`Монета не найдена (cached): ${symbol}`);
    }

    // ✅ ПРОВЕРКА 2: Memory cache (0ms)
    const memoryCached = this.memoryCache.get(key);
    if (memoryCached) {
      // Попытка получить image из Redis (если ещё нет в памяти)
      if (!memoryCached.image) {
        const image = await this.getImageFromRedis(key);
        if (image) {
          memoryCached.image = image;
        }
      }
      return { symbol: key, id: memoryCached.id, image: memoryCached.image };
    }

    // ✅ ПРОВЕРКА 3: Redis cache (1-2ms)
    try {
      const redisKey = `coin:${key}`;
      const redisCached = await this.redis.get<string>(redisKey);

      if (redisCached) {
        // Проверка на маркер "не найдено"
        if (redisCached === NOT_FOUND_MARKER) {
          this.notFoundCache.set(key, Date.now());
          throw new Error(`Монета не найдена (cached in Redis): ${symbol}`);
        }

        // Прогреваем memory cache
        const image = await this.getImageFromRedis(key);
        this.memoryCache.set(key, { id: redisCached, image });
        return { symbol: key, id: redisCached, image };
      }
    } catch (err) {
      // Redis не должен ломать основной flow
      if (err instanceof Error && err.message.includes('cached')) {
        throw err;
      }
      this.logger.debug(`[CoinGecko:Resolver] Redis error: ${err}`);
    }

    // ✅ ПРОВЕРКА 4: PostgreSQL (1-5ms)
    const dbCoin = await this.repo.findBySymbol(key);
    if (dbCoin) {
      const image = await this.getImageFromRedis(key);
      this.memoryCache.set(key, { id: dbCoin.geckoId, image });

      // Синхронизируем Redis
      await this.redis.set(`coin:${key}`, dbCoin.geckoId, GECKO_ID_TTL);

      return { symbol: key, id: dbCoin.geckoId, image };
    }

    // ✅ ПРОВЕРКА 5: CoinGecko API (800ms+)
    const result = await this.searchCoinWithRetry(symbol);

    if (!result) {
      // Кэшируем "не найдено" в Redis и памяти
      await this.redis.set(`coin:${key}`, NOT_FOUND_MARKER, NOT_FOUND_TTL);
      this.notFoundCache.set(key, Date.now());
      throw new Error(`Монета не найдена: ${symbol}`);
    }

    // ✅ СОХРАНЕНИЕ РЕЗУЛЬТАТА
    // Race condition защита (P2002 — unique constraint violation)
    try {
      await this.repo.upsert(key, result.id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.repo.findBySymbol(key);
        if (existing) {
          this.memoryCache.set(key, { id: existing.geckoId, image: result.image });
          await this.redis.set(`coin:${key}`, existing.geckoId, GECKO_ID_TTL);
          if (result.image) {
            await this.redis.set(`market:image:${key}`, result.image, IMAGE_TTL);
          }
          return { symbol: key, id: existing.geckoId, image: result.image };
        }
      }
      throw error;
    }

    // Финальное сохранение во все уровни кэша
    this.memoryCache.set(key, { id: result.id, image: result.image });
    await this.redis.set(`coin:${key}`, result.id, GECKO_ID_TTL);
    if (result.image) {
      await this.redis.set(`market:image:${key}`, result.image, IMAGE_TTL);
    }

    this.logger.log(
      `[CoinGecko:Resolver] ✅ Новая монета: ${symbol} → ${result.id}`,
    );

    return { symbol: key, id: result.id, image: result.image };
  }

  // ─────────────────────────────────────────────────────────────
  // ПАКЕТНЫЙ РЕЗОЛВЕР
  // ─────────────────────────────────────────────────────────────

  /**
   * Резолвит массив символов с частичным успехом
   * Использует Promise.allSettled для устойчивости к ошибкам
   */
  async resolveMany(symbols: string[]): Promise<ResolvedCoin[]> {
    const results = await Promise.allSettled<ResolvedCoin>(
      symbols.map(async (symbol) => {
        const resolved = await this.resolve(symbol);
        return { symbol, id: resolved.id, image: resolved.image };
      }),
    );

    const resolved: ResolvedCoin[] = results
      .filter(
        (r): r is PromiseFulfilledResult<ResolvedCoin> =>
          r.status === 'fulfilled',
      )
      .map((r) => r.value);

    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      this.logger.warn(
        `[CoinGecko:Resolver] ⚠️ Не удалось резолвить ${failed}/${symbols.length} монет`,
      );
    }

    return resolved;
  }

  // ─────────────────────────────────────────────────────────────
  // ПОЛУЧЕНИЕ IMAGE ИЗ REDIS
  // ─────────────────────────────────────────────────────────────

  private async getImageFromRedis(symbol: string): Promise<string | undefined> {
    try {
      return (await this.redis.get<string>(`market:image:${symbol}`)) || undefined;
    } catch {
      return undefined;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ЗАПРОС К COINGECKO С RETRY
  // ─────────────────────────────────────────────────────────────

  /**
   * Делает запрос к CoinGecko /search с retry при rate limit (429)
   */
  private async searchCoinWithRetry(
    symbol: string,
    attempt = 1,
  ): Promise<{ id: string; image?: string } | null> {
    const baseUrl = this.config.get<string>('COINGECKO_API_URL');
    if (!baseUrl) {
      throw new Error('COINGECKO_API_URL не настроен в .env');
    }

    try {
      const { data } = await axios.get<CoinGeckoSearch>(`${baseUrl}/search`, {
        params: { query: symbol },
        timeout: 5000,
      });

      return this.parseSearchResult(symbol, data);
    } catch (error) {
      const axiosError = error as AxiosError;

      // ✅ RETRY ПРИ RATE LIMIT (429)
      if (axiosError.response?.status === 429 && attempt < MAX_RETRIES) {
        const retryDelay = BASE_RETRY_DELAY_MS * attempt;
        this.logger.warn(
          `[CoinGecko:Resolver] ⏳ Rate limit для ${symbol}, retry ${attempt}/${MAX_RETRIES} через ${retryDelay}мс`,
        );
        await new Promise((r) => setTimeout(r, retryDelay));
        return this.searchCoinWithRetry(symbol, attempt + 1);
      }

      // Другие ошибки — логируем и возвращаем null
      this.logger.warn(
        `[CoinGecko:Resolver] ❌ Search failed for ${symbol}: ${axiosError.message || 'unknown'}`,
      );
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ПАРСИНГ РЕЗУЛЬТАТА ПОИСКА
  // ─────────────────────────────────────────────────────────────

  /**
   * Парсит ответ CoinGecko /search и выбирает лучшую монету
   *
   * Приоритет:
   * 1. Точное совпадение по symbol
   * 2. Совпадение по symbol с market_cap_rank <= RANK_LIMIT
   * 3. Лучшая по market_cap_rank из всех результатов
   */
  private parseSearchResult(
    symbol: string,
    data: CoinGeckoSearch,
  ): { id: string; image?: string } | null {
    const upperSymbol = symbol.toUpperCase();

    // 1. Точное совпадение по symbol
    const exact = data.coins?.find(
      (c) => c.symbol.toUpperCase() === upperSymbol,
    );
    if (exact) {
      return {
        id: exact.id,
        image: exact.large || exact.thumb,
      };
    }

    // 2. Фильтруем по market cap rank (защита от скама)
    const candidates = data.coins?.filter(
      (c) => c.symbol.toUpperCase() === upperSymbol,
    ) || [];

    const pool = candidates.length > 0 ? candidates : data.coins || [];
    const best = pool
      .filter((c) => (c.market_cap_rank ?? 999999) <= RANK_LIMIT)
      .sort(
        (a, b) =>
          (a.market_cap_rank ?? 999999) - (b.market_cap_rank ?? 999999),
      )[0];

    if (!best) return null;

    return {
      id: best.id,
      image: best.large || best.thumb,
    };
  }
}