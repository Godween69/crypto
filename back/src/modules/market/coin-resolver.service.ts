// back/src/modules/market/coin-resolver.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ConfigService } from '@nestjs/config';

import axios from 'axios';

import { CoinRepository } from './coin.repository';
import { RedisService } from '../../redis/redis.service';

// Ответ CoinGecko
type CoinGeckoSearch = {
  coins: {
    id: string;
    symbol: string;
    name: string;
    market_cap_rank: number;
  }[];
};

// Пакетный тип
type ResolvedCoin = {
  symbol: string;
  id: string;
};

@Injectable()
export class CoinResolverService implements OnModuleInit {
  private map = new Map<string, string>();

  // TTL для кэширования "монеты нет" (чтобы не спамить API при опечатках)
  private readonly NOT_FOUND_TTL = 300; // 5 минут

  constructor(
    private repo: CoinRepository,
    private config: ConfigService, //Чтение .env
    private redis: RedisService, // добавляем Redis слой между map и БД
  ) {}

  // ────── Прогрев кэша при старте ────────────────────────────────────

  // Загружаем все используемые монеты из БД в память.
  async init() {
    const coins = await this.repo.findAll();
    this.map = new Map(coins.map((c) => [c.symbol.toUpperCase(), c.geckoId]));
  }
  // авто-прогрев кэша (до того, как придёт первый пользователь)
  async onModuleInit() {
    await this.init();
  }

  // ────── Резолвер symbol -> gecko id ────────────────────────────────────

  async resolve(symbol: string): Promise<string> {
    const key = symbol.toUpperCase();

    // 1. Память (0мс)
    // самый быстрый слой (in-process cache)
    const cached = this.map.get(key);
    if (cached) return cached;

    // 2. Redis cache (1–2мс, shared между инстансами)
    const redisKey = `coin:${key}`;

    try {
      const redisCached = await this.redis.get<string>(redisKey);
      if (redisCached) {
        // 🔥 FIX: Проверка на маркер "не найдено", чтобы не искать снова
        if (redisCached === '__NOT_FOUND__') {
          throw new Error(`Монета не найдена (cached): ${symbol}`);
        }
        this.map.set(key, redisCached); // прогреваем memory cache
        return redisCached;
      }
    } catch {
      // Redis не должен ломать основной flow
      // fallback просто продолжается дальше
    }

    // 3. База данных (1–5мс)
    const dbCoin = await this.repo.findBySymbol(key);

    if (dbCoin) {
      this.map.set(key, dbCoin.geckoId);

      // сохраняем в Redis (TTL: 24h)
      await this.redis.set(redisKey, dbCoin.geckoId, 60 * 60 * 24);

      return dbCoin.geckoId;
    }

    //  4. Внешний API (800мс)
    const geckoId = await this.searchCoin(symbol);

    // Если нет - бросаем ошибку
    if (!geckoId) {
      // 🔥 FIX: Кэшируем отсутствие монеты, чтобы не долбить API при повторных вводах мусора
      await this.redis.set(redisKey, '__NOT_FOUND__', this.NOT_FOUND_TTL);
      throw new Error(`Монета не найдена: ${symbol}`);
    }

    //  Race Condition защита (DB write)
    try {
      await this.repo.upsert(key, geckoId);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const existing = await this.repo.findBySymbol(key);

          if (existing) {
            this.map.set(key, existing.geckoId);

            // sync Redis тоже
            await this.redis.set(redisKey, existing.geckoId, 60 * 60 * 24);

            return existing.geckoId;
          }
        }
      }

      throw error;
    }

    //Финальное сохранение (memory + Redis)
    this.map.set(key, geckoId);
    await this.redis.set(redisKey, geckoId, 60 * 60 * 24);

    return geckoId;
  }

  // ────── Пакетный резолвер ────────────────────────────────────

  // Используем метод allSettled для частичного успеха
  async resolveMany(symbols: string[]): Promise<ResolvedCoin[]> {
    const results = await Promise.allSettled(
      symbols.map(async (symbol) => ({
        symbol,
        id: await this.resolve(symbol),
      })),
    );

    return results
      .filter(
        (r): r is PromiseFulfilledResult<ResolvedCoin> =>
          r.status === 'fulfilled',
      )
      .map((r) => r.value);
  }

  // ────── Запрос к CoinGecko ────────────────────────────────────

  private async searchCoin(symbol: string): Promise<string | null> {
    //
    const baseUrl = this.config.get<string>('COINGECKO_API_URL');
    if (!baseUrl) throw new Error('COINGECKO_API_URL не настроен в .env');

    // CoinGecko /search возвращает список похожих монет
    try {
      const { data } = await axios.get<CoinGeckoSearch>(`${baseUrl}/search`, {
        params: { query: symbol },
        timeout: 5000, // Не ждём дольше 5 секунд
      });

      const upperSymbol = symbol.toUpperCase();

      // 1. Сначала ищем точное совпадение (самый надежный вариант)
      const exact = data.coins.find(
        (c) => c.symbol.toUpperCase() === upperSymbol,
      );

      if (exact) {
        // найдено строгое совпадение — сразу возвращаем
        return exact.id;
      }

      // 2. Фильтруем кандидатов (защита от мусора)
      // оставляем только те, у которых symbol реально совпадает
      const candidates = data.coins.filter(
        (c) => c.symbol.toUpperCase() === upperSymbol,
      );

      // 3. Безопасный fallback по market cap rank
      // Это защищает от:
      // - скам-токенов
      // - фантомных совпадений
      const RANK_LIMIT = 2000;

      const pool = candidates.length > 0 ? candidates : data.coins;
      const best = pool
        .filter((c) => {
          const rank = c.market_cap_rank ?? 999999;
          return rank <= RANK_LIMIT;
        })
        .sort(
          (a, b) =>
            (a.market_cap_rank ?? 999999) - (b.market_cap_rank ?? 999999),
        )[0];

      // 4. Если ничего адекватного не нашли — проваливаемся в null
      if (!best) return null;

      return best.id;
    } catch (error) {
      // при проблемах с API просто возвращаем null
      // Выше по стеку resolve() выбросит понятную ошибку "Монета не найдена"
      return null;
    }
  }
}
