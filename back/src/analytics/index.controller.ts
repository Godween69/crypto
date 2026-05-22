// back/src/analytics/index.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Controller('analytics')
export class IndexController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('portfolio-index')
  async getIndex(@Query('range') range: string = '1d') {
    // маппинг диапазонов на целевую гранулярность и окно в часах
    const config: Record<string, { granularity: string; hours: number }> = {
      '1d': { granularity: '1h', hours: 24 },
      '7d': { granularity: '1h', hours: 168 },
      '30d': { granularity: '1d', hours: 720 },
      '90d': { granularity: '1d', hours: 2160 },
      '1y': { granularity: '1w', hours: 8760 },
      all: { granularity: '1m', hours: 999999 },
    };

    const { granularity, hours } = config[range] || config['1d'];
    const since = new Date(Date.now() - hours * 3600_000);

    // пытаемся выбрать точки целевой гранулярности
    let points = await this.prisma.portfolioSnapshot.findMany({
      where: { granularity, timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true, totalValue: true },
    });

    // 🔥 фоллбэк: если кроны ещё не создали старшие уровни, берём 1h
    if (points.length === 0 && granularity !== '1h') {
      points = await this.prisma.portfolioSnapshot.findMany({
        where: { granularity: '1h', timestamp: { gte: since } },
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true, totalValue: true },
      });
    }

    // прореживание до 60 точек с гарантированным сохранением границ
    const MAX = 60;
    if (points.length > MAX) {
      const step = Math.ceil(points.length / MAX);
      const sampled = points.filter((_, i) => i % step === 0);
      if (sampled[0] !== points[0]) sampled.unshift(points[0]);
      if (sampled[sampled.length - 1] !== points[points.length - 1])
        sampled.push(points[points.length - 1]);
      points = sampled;
    }

    return points.map((p) => ({ timestamp: p.timestamp, value: p.totalValue }));
  }
}
