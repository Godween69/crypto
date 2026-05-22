import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IndexModule } from '../../analytics/index.module'; // импорт модуля аналитики

@Module({
  imports: [IndexModule], // предоставляет PortfolioSnapshotService
  controllers: [TransactionController],
  providers: [TransactionService, PrismaService],
})
export class TransactionModule {}