import { Module } from '@nestjs/common';

import { MarketService } from './market.service';
import { MarketController } from './market.controller';
import { CoinResolverService } from './coin-resolver.service';
import { CoinRepository } from './coin.repository';

import { PrismaModule } from '../../common/prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { MarketGateway } from './market.gateway'; // импорт шлюза

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [MarketController],
  providers: [
    MarketService,
    CoinResolverService,
    CoinRepository,
    MarketGateway,
  ],
  exports: [MarketService],
})
export class MarketModule {}
