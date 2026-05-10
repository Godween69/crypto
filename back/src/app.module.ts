//

import { Module } from '@nestjs/common';

import { TransactionModule } from './modules/transaction/transaction.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';

@Module({
  imports: [TransactionModule, PortfolioModule],
})
export class AppModule {}
