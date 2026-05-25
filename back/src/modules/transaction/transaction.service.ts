// back\src\transactions\transaction.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { toDomain } from './mappers/transaction.mapper';
import { Transaction } from './types/transaction.types';
import { PortfolioSnapshotService } from '../../analytics/portfolio-snapshot.service';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    private prisma: PrismaService,
    private snapshotService: PortfolioSnapshotService, // сервис пересборки графика
  ) {}

  // фоновый триггер пересборки: не блокирует HTTP-ответ, ошибки пишутся в лог
  private triggerRebuild(reason: string) {
    this.logger.log(
      `🔁 triggerRebuild [${reason}] → запуск snapshotService.rebuild() в фоне`,
    );
    this.snapshotService
      .rebuild()
      .catch((err) =>
        this.logger.error(
          `❌ Background snapshot rebuild failed [${reason}]`,
          err,
        ),
      );
  }

  async create(dto: CreateTransactionDto): Promise<Transaction> {
    const createdAt = dto.date ? new Date(dto.date) : new Date();
    this.logger.log(
      `➕ Создание транзакции: ${dto.type} ${dto.amount} ${dto.symbol.toUpperCase()} @ $${dto.price}`,
    );
    const tx = await this.prisma.transaction.create({
      data: {
        symbol: dto.symbol.toUpperCase(),
        type: dto.type,
        amount: dto.amount,
        price: dto.price,
        createdAt,
      },
    });
    this.logger.log(`✅ Транзакция создана (id=${tx.id})`);
    this.triggerRebuild(`create:${tx.id}`); // запускаем пересборку в фоне
    return toDomain(tx);
  }

  async findAll(symbol?: string): Promise<Transaction[]> {
    const txs = await this.prisma.transaction.findMany({
      where: symbol ? { symbol: symbol.toUpperCase() } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return txs.map(toDomain);
  }

  async update(id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    this.logger.log(
      `✏️ Обновление транзакции id=${id}: ${JSON.stringify(dto)}`,
    );
    const tx = await this.prisma.transaction.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.symbol && { symbol: dto.symbol.toUpperCase() }),
        ...(dto.date && { createdAt: new Date(dto.date) }),
      },
    });
    this.logger.log(`✅ Транзакция обновлена (id=${tx.id})`);
    this.triggerRebuild(`update:${tx.id}`);
    return toDomain(tx);
  }

  async remove(id: string): Promise<Transaction> {
    this.logger.log(`🗑️ Удаление транзакции id=${id}`);
    const tx = await this.prisma.transaction.delete({ where: { id } });
    this.logger.log(
      `✅ Транзакция удалена (id=${tx.id}, ${tx.type} ${tx.amount} ${tx.symbol})`,
    );
    this.triggerRebuild(`remove:${tx.id}`);
    return toDomain(tx);
  }

  async deleteBySymbol(symbol: string): Promise<void> {
    this.logger.log(
      `🗑️ Удаление всех транзакций для символа ${symbol.toUpperCase()}`,
    );
    const result = await this.prisma.transaction.deleteMany({
      where: { symbol: symbol.toUpperCase() },
    });
    this.logger.log(
      `✅ Удалено транзакций: ${result.count} для ${symbol.toUpperCase()}`,
    );
    this.triggerRebuild(`deleteBySymbol:${symbol}`);
  }
}
