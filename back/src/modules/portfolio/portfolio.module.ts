import { Module } from '@nestjs/common';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from '../portfolio/portfolio.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [PortfolioController],
  providers: [PortfolioService, PrismaService],
})
export class PortfolioModule {}