// back/src/providers/coingecko/coingecko.provider.ts
// Провайдер CoinGecko: источник метаданных (картинки + geckoId) и фоллбэк для цен
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { MarketDataProvider } from '../market-provider.interface';
import { MarketData } from '../../modules/market/types/market.types';

type GeckoSearchResult = {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  large: string;
};

@Injectable()
export class CoingeckoProvider implements MarketDataProvider {
  readonly name = 'coingecko';
  private readonly logger = new Logger(CoingeckoProvider.name);
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';

  // Внутренний кэш symbol -> { geckoId, image } для избежания повторных запросов
  private metadataCache = new Map<string, { geckoId: string; image: string }>();

  // Загрузка метаданных (картинка + geckoId) для новых монет через /search
  async loadMetadata(symbols: string[]): Promise<void> {
    const toFetch = symbols.filter(
      (s) => !this.metadataCache.has(s.toUpperCase()),
    );
    if (toFetch.length === 0) return;

    for (const sym of toFetch) {
      try {
        const { data } = await axios.get<{ coins: GeckoSearchResult[] }>(
          `${this.baseUrl}/search`,
          {
            params: { query: sym },
            timeout: 10000,
          },
        );
        // Ищем точное совпадение по символу (Gecko может вернуть несколько похожих)
        const match = data.coins?.find(
          (c) => c.symbol.toUpperCase() === sym.toUpperCase(),
        );
        if (match) {
          this.metadataCache.set(sym.toUpperCase(), {
            geckoId: match.id,
            image: match.large || match.thumb, // large = 250px, thumb = 25px
          });
        }
        // Пауза 1.5 сек, чтобы не улететь в rate limit (бесплатный API ~10-30 req/min)
        await new Promise((r) => setTimeout(r, 1500));
      } catch (e) {
        this.logger.warn(
          `Gecko search failed for ${sym}: ${e instanceof Error ? e.message : 'unknown'}`,
        );
      }
    }
  }

  // Геттер для извлечения метаданных из кэша
  getMetadata(symbol: string): { geckoId: string; image: string } | undefined {
    return this.metadataCache.get(symbol.toUpperCase());
  }

  // Фоллбэк для цен (используется, если CoinLore не нашел монету)
  async fetch(symbols: string[]): Promise<MarketData[]> {
    if (symbols.length === 0) return [];
    await this.loadMetadata(symbols); // Убеждаемся, что у нас есть geckoId

    const ids = symbols
      .map((s) => this.metadataCache.get(s.toUpperCase())?.geckoId)
      .filter((id): id is string => !!id);
    if (ids.length === 0) return [];

    try {
      // /simple/price требует именно geckoId (bitcoin), а не символ (btc)
      const { data } = await axios.get(`${this.baseUrl}/simple/price`, {
        params: {
          ids: ids.join(','),
          vs_currencies: 'usd',
          include_24hr_change: 'true',
          include_market_cap_rank: 'true',
        },
        timeout: 10000,
      });

      const results: MarketData[] = [];
      for (const sym of symbols) {
        const meta = this.metadataCache.get(sym.toUpperCase());
        if (!meta || !data[meta.geckoId]) continue;
        const raw = data[meta.geckoId];
        results.push({
          coinId: meta.geckoId,
          symbol: sym.toUpperCase(),
          currentPrice: raw.usd || 0,
          change24h: raw.usd_24h_change || 0,
          image: meta.image,
          rank: raw.usd_market_cap_rank || null,
        });
      }
      return results;
    } catch (error) {
      this.logger.error(
        `❌ CoinGecko price fetch failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return [];
    }
  }
}
