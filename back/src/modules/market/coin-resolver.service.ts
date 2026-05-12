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

  // memory cache symbol -> gecko id
  private map = new Map<string, string>();

  constructor(
    private repo: CoinRepository,
    private config: ConfigService,
  ) {}

  // preload db cache
  async init() {
    const coins = await this.repo.findAll();

    this.map = new Map(coins.map((c) => [c.symbol.toUpperCase(), c.geckoId]));

    this.logger.log(`[INIT] loaded coins: ${this.map.size}`);
  }

  // resolve symbol -> gecko id
  async resolve(symbol: string): Promise<string> {
    const key = symbol.toUpperCase();

    // fast memory cache
    const cached = this.map.get(key);

    if (cached) return cached;

    // db lookup
    const dbCoin = await this.repo.findBySymbol(key);

    if (dbCoin) {
      this.map.set(key, dbCoin.geckoId);

      return dbCoin.geckoId;
    }

    // fallback CoinGecko search
    const geckoId = await this.searchCoin(symbol);

    if (!geckoId) {
      throw new Error(`Coin not found: ${symbol}`);
    }

    // persist in db
    await this.repo.upsert(key, geckoId);

    // update memory cache
    this.map.set(key, geckoId);

    return geckoId;
  }

  // parallel batch resolve
  async resolveMany(symbols: string[]): Promise<ResolvedCoin[]> {
    return Promise.all(
      symbols.map(async (symbol) => ({
        symbol,
        id: await this.resolve(symbol),
      })),
    );
  }

  // CoinGecko search endpoint
  private async searchCoin(symbol: string): Promise<string | null> {
    const baseUrl = this.config.get<string>('COINGECKO_API_URL');

    const { data } = await axios.get<CoinGeckoSearch>(`${baseUrl}/search`, {
      params: {
        query: symbol,
      },
    });

    // exact symbol match
    const exact = data.coins.find(
      (c) => c.symbol.toUpperCase() === symbol.toUpperCase(),
    );

    // fallback top ranked coin
    const best =
      exact ??
      data.coins.sort(
        (a, b) => (a.market_cap_rank ?? 999999) - (b.market_cap_rank ?? 999999),
      )[0];

    if (!best) return null;

    this.logger.log(
      `[SEARCH] ${symbol} -> ${best.id} (#${best.market_cap_rank})`,
    );

    return best.id;
  }
}
