import { Controller, Get, Query } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketData } from './types/market.types';

@Controller('market')
export class MarketController {
  constructor(private readonly service: MarketService) {}

  @Get()
  getMarketData(@Query('symbols') symbols: string): Promise<MarketData[]> {
    const list = symbols ? symbols.split(',') : ['BTC', 'ETH'];

    return this.service.getMarketData(list);
  }
}
