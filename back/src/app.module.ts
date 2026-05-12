// back/src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { TransactionModule } from './modules/transaction/transaction.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { MarketModule } from './modules/market/market.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TransactionModule,
    PortfolioModule,
    MarketModule,
  ],
})
export class AppModule {}
