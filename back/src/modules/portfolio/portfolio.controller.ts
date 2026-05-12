//back\src\modules\portfolio\portfolio.controller.ts

import { Controller, Get } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';

@Controller('portfolio')
export class PortfolioController {
  constructor(private service: PortfolioService) {}

  @Get()
  getPortfolio() {
    return this.service.getPortfolio();
  }
}