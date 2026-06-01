// back/src/providers/coinlore/coinlore.provider.ts
// Провайдер CoinLore: оффлайн-справочник + улучшенные картинки
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { MarketDataProvider } from '../market-provider.interface';
import { MarketData } from '../../modules/market/types/market.types';

type CoinLoreAsset = {
  id: string;
  symbol: string;
  name: string;
  nameid: string;
  rank: number;
};
type CoinLoreTicker = {
  id: string;
  symbol: string;
  name: string;
  rank: number;
  price_usd: string;
  percent_change_24h: string;
  market_cap_usd: string;
  volume24: string | number;
};

// Метаданные монеты: id для API + nameid для картинок
type CoinMeta = { id: string; nameid: string };

@Injectable()
export class CoinloreProvider implements MarketDataProvider, OnModuleInit {
  readonly name = 'coinlore';
  private readonly logger = new Logger(CoinloreProvider.name);
  private readonly baseUrl = 'https://api.coinlore.net';

  // Храним и id (для API), и nameid (для картинок)
  private symbolMap = new Map<string, CoinMeta>();
  private isMapLoaded = false;

  async onModuleInit() {
    this.loadAssetsMap(); // мгновенное чтение с диска
  }

  async fetch(symbols: string[]): Promise<MarketData[]> {
    if (symbols.length === 0 || !this.isMapLoaded) return [];

    // Резолвим символы в ID, сохраняя маппинг для nameid
    const idToSymbol = new Map<string, string>();
    for (const s of symbols) {
      const meta = this.symbolMap.get(s.toUpperCase());
      if (meta) idToSymbol.set(meta.id, s.toUpperCase());
    }

    if (idToSymbol.size === 0) return [];

    try {
      const { data } = await axios.get<
        CoinLoreTicker[] | { data: CoinLoreTicker[] }
      >(`${this.baseUrl}/api/ticker/`, {
        params: { id: Array.from(idToSymbol.keys()).join(',') },
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0 Safari/537.36',
        },
      });

      const tickers = Array.isArray(data) ? data : data.data;

      return tickers.map((raw) => {
        const symbol = raw.symbol.toUpperCase();
        const nameid =
          this.symbolMap.get(symbol)?.nameid ||
          raw.name ||
          symbol.toLowerCase();

        return {
          coinId: raw.name,
          symbol,
          currentPrice: parseFloat(raw.price_usd) || 0,
          change24h: parseFloat(raw.percent_change_24h) || 0,
          // Родной CDN CoinLore (25px) + CoinCap (64px) как запасной
          image: this.buildImageUrl(nameid, symbol),
          rank: raw.rank || null,
        };
      });
    } catch (error) {
      this.logger.error(
        `❌ CoinLore: ${error instanceof Error ? error.message : 'ошибка'}`,
      );
      return [];
    }
  }

  // Формирование URL картинки с приоритетом качества
  private buildImageUrl(nameid: string, symbol: string): string {
    // CoinCap @2x (64px) — хорошее качество для топ-монет
    // Если иконки нет на CoinCap, фронтенд через onError переключится на CoinLore
    return `https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`;
  }

  private loadAssetsMap(): void {
    try {
      const filePath = path.join(
        process.cwd(),
        'src',
        'assets',
        'coinlore-assets.json',
      );

      if (!fs.existsSync(filePath)) {
        this.logger.warn(`⚠️ Файл ${filePath} не найден. CoinLore отключен.`);
        return;
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      const assets: CoinLoreAsset[] = Array.isArray(parsed)
        ? parsed
        : parsed.data;

      for (const asset of assets) {
        if (asset.symbol && asset.id) {
          this.symbolMap.set(asset.symbol.toUpperCase(), {
            id: asset.id,
            nameid: asset.nameid || asset.symbol.toLowerCase(),
          });
        }
      }

      this.isMapLoaded = true;
      this.logger.log(
        `✓ CoinLore справочник: ${this.symbolMap.size} символов (с nameid)`,
      );
    } catch (e) {
      this.logger.error(
        `❌ Ошибка чтения справочника: ${e instanceof Error ? e.message : 'unknown'}`,
      );
    }
  }
}
