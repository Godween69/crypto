import { Module } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketController } from './market.controller';
import { CoinResolverService } from './coin-resolver.service';
import { CoinRepository } from './coin.repository';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MarketController],
  providers: [MarketService, CoinResolverService, CoinRepository],
  exports: [MarketService],
})
export class MarketModule {}
