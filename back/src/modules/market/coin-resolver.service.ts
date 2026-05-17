// back/src/modules/market/coin-resolver.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ConfigService } from '@nestjs/config';

import axios from 'axios';

import { CoinRepository } from './coin.repository';

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

  constructor(
    private repo: CoinRepository,
    private config: ConfigService, //Чтение .env
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

    // Память (0мс) Если нет -> идем в БД
    const cached = this.map.get(key);
    if (cached) return cached;

    // База данных (1-5мс) Если нет -> идем на внешний API
    const dbCoin = await this.repo.findBySymbol(key);

    if (dbCoin) {
      this.map.set(key, dbCoin.geckoId); // если есть -> кладем в память

      return dbCoin.geckoId;
    }
    // Внешний API (800мс)
    const geckoId = await this.searchCoin(symbol);

    // Если нет - бросаем ошибку
    if (!geckoId) throw new Error(`Монета не найдена: ${symbol}`);

    // Если нашли - сохраняем результат
    // Race Condition защита
    try {
      await this.repo.upsert(key, geckoId); // <- кладем в БД
    } catch (error) {
      // Если ошибка относится к Prisma
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Если P2002 = другой поток уже вставил эту монету
        if (error.code === 'P2002') {
          // Просто читаем то, что уже создал соседний поток
          const existing = await this.repo.findBySymbol(key);
          if (existing) {
            this.map.set(key, existing.geckoId);
            return existing.geckoId;
          }
        }
      }
      // Любая другая ошибка (сеть, БД, таймаут) -> пробрасываем как есть
      throw error;
    }
    this.map.set(key, geckoId); // <- кладем в память

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
      // Сначала ищем точное совпадение
      const exact = data.coins.find(
        (c) => c.symbol.toUpperCase() === symbol.toUpperCase(),
      );

      // fallback берем монету с наименьшим(топовым) market_cap_rank (1-Bitcoin, 2-Ethereum)
      // Это защищает от фейковых токенов с тем же тикером.
      const best =
        exact ??
        data.coins.toSorted(
          (a, b) =>
            (a.market_cap_rank ?? 999999) - (b.market_cap_rank ?? 999999),
        )[0];

      if (!best) return null;

      return best.id;
    } catch (error) {
      // при проблемах с API просто возвращаем null
      // Выше по стеку resolve() выбросит понятную ошибку "Монета не найдена"
      return null;
    }
  }
}
