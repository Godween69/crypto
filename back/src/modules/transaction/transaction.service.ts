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
  private triggerRebuild() {
    this.snapshotService
      .rebuild()
      .catch((err) =>
        this.logger.error('Background snapshot rebuild failed', err),
      );
  }

  async create(dto: CreateTransactionDto): Promise<Transaction> {
    const createdAt = dto.date ? new Date(dto.date) : new Date();
    const tx = await this.prisma.transaction.create({
      data: {
        symbol: dto.symbol.toUpperCase(),
        type: dto.type,
        amount: dto.amount,
        price: dto.price,
        createdAt,
      },
    });
    this.triggerRebuild(); // запускаем пересборку в фоне
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
    const tx = await this.prisma.transaction.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.symbol && { symbol: dto.symbol.toUpperCase() }),
        ...(dto.date && { createdAt: new Date(dto.date) }),
      },
    });
    this.triggerRebuild();
    return toDomain(tx);
  }

  async remove(id: string): Promise<Transaction> {
    const tx = await this.prisma.transaction.delete({ where: { id } });
    this.triggerRebuild();
    return toDomain(tx);
  }

  async deleteBySymbol(symbol: string): Promise<void> {
    await this.prisma.transaction.deleteMany({
      where: { symbol: symbol.toUpperCase() },
    });
    this.triggerRebuild();
  }
}
