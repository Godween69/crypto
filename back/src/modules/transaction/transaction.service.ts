// back/src/modules/transaction/transaction.service.ts

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';

import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

import { toDomain } from './mappers/transaction.mapper';

import { Transaction } from './types/transaction.types';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  // CREATE
  async create(dto: CreateTransactionDto): Promise<Transaction> {
    const tx = await this.prisma.transaction.create({
      data: {
        ...dto,
        symbol: dto.symbol.toUpperCase(),
      },
    });

    return toDomain(tx);
  }

  // GET ALL OR FILTER BY SYMBOL
  async findAll(symbol?: string): Promise<Transaction[]> {
    const txs = await this.prisma.transaction.findMany({
      where: symbol
        ? {
            symbol: symbol.toUpperCase(),
          }
        : undefined,

      orderBy: {
        createdAt: 'desc',
      },
    });

    return txs.map(toDomain);
  }

  // UPDATE
  async update(id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    const tx = await this.prisma.transaction.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.symbol && {
          symbol: dto.symbol.toUpperCase(),
        }),
      },
    });

    return toDomain(tx);
  }

  // DELETE
  async remove(id: string): Promise<Transaction> {
    const tx = await this.prisma.transaction.delete({
      where: { id },
    });

    return toDomain(tx);
  }

  async deleteBySymbol(symbol: string): Promise<void> {
  await this.prisma.transaction.deleteMany({
    where: {
      symbol: symbol.toUpperCase(),
    },
  });
}
}
