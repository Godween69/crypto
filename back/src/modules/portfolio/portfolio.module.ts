// back/src/modules/portfolio/portfolio.module.ts

import { Module } from '@nestjs/common';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { MarketModule } from '../market/market.module';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule, // Делает PrismaService доступным для внедрения
    MarketModule, // Делает MarketService доступным для внедрения
  ],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
