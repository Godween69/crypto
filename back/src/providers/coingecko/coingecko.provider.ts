// back/src/providers/coingecko/coingecko.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';

import { MarketDataProvider } from '../market-provider.interface';
import { MarketData } from '../../modules/market/types/market.types';
import { CoingeckoResolver } from './coingecko.resolver';

// ==========================================
// КОНСТАНТЫ
// ==========================================

// Максимальное количество retry при rate limit (429)
const MAX_RETRIES = 3;

// Базовая задержка для exponential backoff (5 секунд)
const BASE_RETRY_DELAY_MS = 5000;

// ==========================================
// ПРОВАЙДЕР
// ==========================================

@Injectable()
export class CoingeckoProvider implements MarketDataProvider {
  readonly name = 'coingecko';

  private readonly logger = new Logger(CoingeckoProvider.name);
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';

  constructor(
    private readonly resolver: CoingeckoResolver,
    private readonly config: ConfigService,
  ) { }

  // ─────────────────────────────────────────────────────────────
  // ПОЛУЧЕНИЕ ЦЕН
  // ─────────────────────────────────────────────────────────────

  /**
   * Получает цены для списка символов
   *
   * Поток данных:
   * 1. Резолвим все символы через CoingeckoResolver (4 уровня кэша)
   * 2. Извлекаем geckoId из результатов
   * 3. Делаем ОДИН запрос к /simple/price для всех монет
   * 4. Склеиваем цены с метаданными (image)
   */
  async fetch(symbols: string[]): Promise<MarketData[]> {
    if (symbols.length === 0) return [];

    // ✅ ШАГ 1: Резолвим все символы через единый resolver
    const resolved = await this.resolver.resolveMany(symbols);

    if (resolved.length === 0) {
      this.logger.warn(
        `[CoinGecko:Provider] ⚠️ Нет geckoId для монет: ${symbols.join(', ')}`,
      );
      return [];
    }

    // ✅ ШАГ 2: Извлекаем geckoId
    const ids = resolved.map((r) => r.id);
    const idToSymbol = new Map(resolved.map((r) => [r.id, r.symbol]));
    const idToImage = new Map(
      resolved.filter((r) => r.image).map((r) => [r.id, r.image!]),
    );

    // ✅ ШАГ 3: ОДИН запрос к /simple/price для всех монет
    const prices = await this.fetchPricesWithRetry(ids);

    if (Object.keys(prices).length === 0) {
      this.logger.warn(
        `[CoinGecko:Provider] ⚠️ CoinGecko не вернул цены для ${ids.length} монет`,
      );
      return [];
    }

    // ✅ ШАГ 4: Склеиваем цены с метаданными
    const results: MarketData[] = [];
    for (const geckoId of ids) {
      const symbol = idToSymbol.get(geckoId);
      const price = prices[geckoId];

      if (!symbol || !price) continue;

      results.push({
        coinId: geckoId,
        symbol: symbol.toUpperCase(),
        currentPrice: price.usd || 0,
        change24h: price.usd_24h_change || 0,
        image: idToImage.get(geckoId) || '',
        rank: price.usd_market_cap_rank || null,
      });
    }

    this.logger.debug(
      `[CoinGecko:Provider] ✅ Получены цены для ${results.length}/${symbols.length} монет`,
    );

    return results;
  }

  // ─────────────────────────────────────────────────────────────
  // ЗАПРОС ЦЕН С RETRY
  // ─────────────────────────────────────────────────────────────

  /**
   * Делает запрос к /simple/price с retry при rate limit (429)
   */
  private async fetchPricesWithRetry(
    ids: string[],
    attempt = 1,
  ): Promise<Record<string, { usd: number; usd_24h_change: number; usd_market_cap_rank: number | null }>> {
    try {
      const { data } = await axios.get(`${this.baseUrl}/simple/price`, {
        params: {
          ids: ids.join(','),
          vs_currencies: 'usd',
          include_24hr_change: 'true',
          include_market_cap_rank: 'true',
        },
        timeout: 10000,
      });

      return data;
    } catch (error) {
      const axiosError = error as AxiosError;

      // ✅ RETRY ПРИ RATE LIMIT (429)
      if (axiosError.response?.status === 429 && attempt < MAX_RETRIES) {
        const retryDelay = BASE_RETRY_DELAY_MS * attempt;
        this.logger.warn(
          `[CoinGecko:Provider] ⏳ Rate limit, retry ${attempt}/${MAX_RETRIES} через ${retryDelay}мс`,
        );
        await new Promise((r) => setTimeout(r, retryDelay));
        return this.fetchPricesWithRetry(ids, attempt + 1);
      }

      // Другие ошибки — логируем и возвращаем пустой объект
      this.logger.error(
        `[CoinGecko:Provider] ❌ Price fetch failed: ${axiosError.message || 'unknown'}`,
      );
      return {};
    }
  }
}