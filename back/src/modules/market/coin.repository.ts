// back/src/modules/market/coin.repository.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CoinRepository {
  constructor(private prisma: PrismaService) {}

  // получить все монеты из БД // используется для прогрева памяти
  findAll() {
    return this.prisma.coin.findMany();
  }

  // найти по символу // быстрый lookup из БД
  findBySymbol(symbol: string) {
    return this.prisma.coin.findUnique({
      where: { symbol },
    });
  }

  // сохранить или обновить монету // upsert для актуальности
  upsert(symbol: string, geckoId: string, name?: string) {
    return this.prisma.coin.upsert({
      where: { symbol },
      update: { geckoId, name },
      create: { symbol, geckoId, name },
    });
  }
}
