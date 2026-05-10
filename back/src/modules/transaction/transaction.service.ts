import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { toDomain } from './mappers/transaction.mapper';
import { Transaction } from './types/transaction.types';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTransactionDto): Promise<Transaction> {
    const tx = await this.prisma.transaction.create({
      data: dto,
    });

    return toDomain(tx);
  }

  async findAll(): Promise<Transaction[]> {
    const txs = await this.prisma.transaction.findMany();
    return txs.map(toDomain);
  }
}
