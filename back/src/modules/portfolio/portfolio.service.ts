import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { calculatePortfolio } from './core/calculatePortfolio';
import { toDomain } from '../transaction/mappers/transaction.mapper';

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  async getPortfolio() {
    const txs = await this.prisma.transaction.findMany();

    const domainTxs = txs.map(toDomain);

    return calculatePortfolio(domainTxs);
  }
}
