// back/src/modules/market/coin.repository.ts
// Репозиторий для работы со справочником монет (хранение картинок)
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CoinRepository {
  constructor(private prisma: PrismaService) {}

  // получить все монеты из БД (используется для прогрева памяти)
  findAll() {
    return this.prisma.coin.findMany();
  }

  // найти по символу (быстрый lookup из БД)
  findBySymbol(symbol: string) {
    return this.prisma.coin.findUnique({
      where: { symbol: symbol.toUpperCase() },
    });
  }

  // сохранить или обновить монету (upsert для актуальности)
  upsert(symbol: string, geckoId?: string, name?: string, image?: string) {
    return this.prisma.coin.upsert({
      where: { symbol: symbol.toUpperCase() },
      update: { geckoId, name, image },
      create: {
        symbol: symbol.toUpperCase(),
        geckoId: geckoId || '',
        name,
        image,
      },
    });
  }

  // массовое получение картинок по массиву символов (один запрос к БД)
  async getImages(symbols: string[]): Promise<Map<string, string>> {
    const upperSymbols = symbols.map((s) => s.toUpperCase());
    const coins = await this.prisma.coin.findMany({
      where: {
        symbol: { in: upperSymbols },
        image: { not: null }, // берем только те, где есть картинка
      },
      select: { symbol: true, image: true },
    });
    // Возвращаем Map для O(1) поиска при обогащении данных
    return new Map(coins.map((c) => [c.symbol, c.image as string]));
  }
}
