// back/src/modules/market/market.module.ts
import { Module } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketController } from './market.controller';
import { MarketGateway } from './market.gateway';
import { CoinRepository } from './coin.repository';
import { RedisModule } from '../../redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { CoingeckoResolver } from '../../providers/coingecko/coingecko.resolver';
import { CoingeckoProvider } from '../../providers/coingecko/coingecko.provider';
import { CoinloreProvider } from '../../providers/coinlore/coinlore.provider';

@Module({
  imports: [RedisModule, AuthModule],
  providers: [
    MarketService,
    MarketGateway,
    CoinRepository,
    CoingeckoResolver,
    CoingeckoProvider,
    CoinloreProvider,
  ],
  controllers: [MarketController],
  exports: [MarketService, MarketGateway],
})
export class MarketModule {}
