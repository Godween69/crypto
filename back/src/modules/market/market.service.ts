import {
  Injectable,
  HttpException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
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
  private readonly CACHE_TTL = 300; // время жизни кэша в секундах

  constructor(
    private readonly config: ConfigService,
    private readonly resolver: CoinResolverService,
    private readonly redis: RedisService,
    private readonly gateway: MarketGateway, // шлюз для глобального broadcast
    private readonly prisma: PrismaService, // доступ к таблице транзакций
  ) {}

  async onModuleInit() {
    await this.resolver.init(); // прогреваем маппинг symbol → geckoId при старте
  }

  async getMarketData(symbols: string[]): Promise<MarketData[]> {
    const apiKey = this.config.get<string>('COINGECKO_API_KEY');
    const baseUrl = this.config.get<string>('COINGECKO_API_URL');
    const resolved = await this.resolver.resolveMany(symbols); // резолвим символы в ID
    const ids = resolved
      .map((c) => c.id)
      .sort()
      .join(','); // формируем детерминированный ключ
    const cacheKey = `market:${ids}`;

    try {
      const cached = await this.redis.get<MarketData[]>(cacheKey);
      if (cached) return cached; // возвращаем из кэша при попадании

      const { data } = await axios.get<CoinGeckoMarket>(
        `${baseUrl}/coins/markets`,
        {
          params: { ids, vs_currency: 'usd', price_change_percentage: '24h' },
          headers: { 'x-cg-demo-api-key': apiKey },
          timeout: 5000, // ограничиваем время ожидания внешнего API
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

      await this.redis.set(cacheKey, result, this.CACHE_TTL); // сохраняем нормализованные данные
      const expiresAt = Date.now() + this.CACHE_TTL * 1000; // вычисляем абсолютную метку истечения
      this.gateway.setNextUpdateAt(expiresAt); // синхронизируем метку в шлюзе
      this.gateway.broadcastUpdate(result, expiresAt); // уведомляем все вкладки об обновлении
      return result;
    } catch (e) {
      this.logger.error('Market fetch failed', e);
      throw new HttpException('Market fetch failed', 500);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCronMarketUpdate() {
    if (!this.gateway.hasActiveClients()) {
      this.logger.debug('Cron skipped: нет активных WS-клиентов'); // жёсткий выход до любых запросов
      return;
    }

    this.logger.log('Cron started: обнаружены активные клиенты');
    
    // берём символы из БД
    const records = await this.prisma.transaction.findMany({
      select: { symbol: true },
    });
    // дедуплицируем монеты
    // символ запрашивается только один раз, не важно, сколько транзакций с ним в базе
    const uniqueSymbols = [...new Set(records.map((r) => r.symbol))];
    if (uniqueSymbols.length === 0) {
      this.logger.debug('Cron skipped: портфель пуст');
      return;
    }

    const resolved = await this.resolver.resolveMany(uniqueSymbols); // резолвим в geckoId
    const ids = resolved
      .map((c) => c.id)
      .sort()
      .join(','); // формируем стабильный ключ
    const apiKey = this.config.get<string>('COINGECKO_API_KEY');
    const baseUrl = this.config.get<string>('COINGECKO_API_URL');

    try {
      const { data } = await axios.get<CoinGeckoMarket>(
        `${baseUrl}/coins/markets`,
        {
          params: { ids, vs_currency: 'usd', price_change_percentage: '24h' },
          headers: { 'x-cg-demo-api-key': apiKey },
          timeout: 5000, // защита от зависших запросов
        },
      );

      const allData: MarketData[] = data.map((coin) => ({
        coinId: coin.id,
        symbol: coin.symbol.toUpperCase(),
        currentPrice: coin.current_price ?? 0,
        change24h: coin.price_change_percentage_24h ?? 0,
        image: coin.image,
        rank: coin.market_cap_rank ?? null,
      }));

      await this.redis.set(`market:${ids}`, allData, this.CACHE_TTL); // обновляем глобальный кэш
      const nextAt = Date.now() + this.CACHE_TTL * 1000; // вычисляем метку следующего цикла
      this.gateway.setNextUpdateAt(nextAt); // сохраняем метку в шлюзе
      this.gateway.broadcastUpdate(allData, nextAt); // пушим данные и метку всем вкладкам
      this.logger.log('Cron finished: Redis обновлён, broadcast выполнен');
    } catch (e) {
      this.logger.error('Cron market update failed', e);
    }
  }
}
