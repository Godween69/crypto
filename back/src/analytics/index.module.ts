import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { IndexController } from './index.controller';
import { PortfolioSnapshotService } from './portfolio-snapshot.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { MarketModule } from '../modules/market/market.module';

@Module({
  imports: [ScheduleModule.forRoot(), MarketModule], // планировщик + доступ к Redis-ценам
  controllers: [IndexController],
  providers: [PortfolioSnapshotService, PrismaService],
  exports: [PortfolioSnapshotService], // экспортируем для триггера из TransactionService
})
export class IndexModule {}
