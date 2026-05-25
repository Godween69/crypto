// back\src\analytics\index.module.ts

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { IndexController } from './index.controller';
import { PortfolioSnapshotService } from './portfolio-snapshot.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { MarketModule } from '../modules/market/market.module';
import { RedisModule } from '../redis/redis.module'; // предоставляет RedisService для distributed lock

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MarketModule,
    RedisModule, // необходимо для PortfolioSnapshotService (distributed lock)
  ],
  controllers: [IndexController],
  providers: [PortfolioSnapshotService, PrismaService],
  exports: [PortfolioSnapshotService], // экспортируем для триггера из TransactionService
})
export class IndexModule {}
