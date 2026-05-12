// back/src/modules/market/coin-resolver.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CoinRepository } from './coin.repository';

type CoinGeckoSearch = {
  coins: {
    id: string;
    symbol: string;
    name: string;
    market_cap_rank: number;
  }[];
};

type ResolvedCoin = {
  symbol: string;
  id: string;
};

@Injectable()
export class CoinResolverService {
  private readonly logger = new Logger(CoinResolverService.name);

  // memory cache symbol → id // самый быстрый слой
  private map = new Map<string, string>();

  constructor(
    private repo: CoinRepository,
    private config: ConfigService,
  ) {}

  // init resolver // грузим БД в память
  async init() {
    const coins = await this.repo.findAll();

    this.map = new Map(coins.map((c) => [c.symbol.toUpperCase(), c.geckoId]));

    this.logger.log(`[INIT] loaded coins: ${this.map.size}`);
  }

  // =========================
  // MAIN RESOLVE LOGIC
  // =========================

  async resolve(symbol: string): Promise<string> {
    const key = symbol.toUpperCase();

    // 1. memory fast path // без БД и API
    const cached = this.map.get(key);
    if (cached) return cached;

    // 2. DB lookup // второй слой
    const dbCoin = await this.repo.findBySymbol(key);
    if (dbCoin) {
      this.map.set(key, dbCoin.geckoId);
      return dbCoin.geckoId;
    }

    // 3. fallback CoinGecko search // если вообще ничего нет
    const geckoId = await this.searchCoin(symbol);

    if (!geckoId) {
      throw new Error(`Coin not found: ${symbol}`);
    }

    // 4. save to DB // фиксируем навсегда
    await this.repo.upsert(key, geckoId);

    // 5. update memory
    this.map.set(key, geckoId);

    return geckoId;
  }

  // batch resolve // параллельная обработка символов
  async resolveMany(symbols: string[]): Promise<ResolvedCoin[]> {
    return Promise.all(
      symbols.map(async (symbol) => ({
        symbol,
        id: await this.resolve(symbol),
      })),
    );
  }

  // CoinGecko search API // НЕ coins/list !!!
  private async searchCoin(symbol: string): Promise<string | null> {
    const baseUrl = this.config.get<string>('COINGECKO_API_URL');

    const { data } = await axios.get<CoinGeckoSearch>(`${baseUrl}/search`, {
      params: { query: symbol },
    });

    // берём лучший матч // самый популярный
    const best = data.coins?.[0];

    if (!best) return null;

    this.logger.log(
      `[SEARCH] ${symbol} → ${best.id} (rank ${best.market_cap_rank})`,
    );

    return best.id;
  }
}
