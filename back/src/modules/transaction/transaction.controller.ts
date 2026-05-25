// back/src/modules/transaction/transaction.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';

import { TransactionService } from './transaction.service';

import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

import { Transaction } from '@prisma/client';

@Controller('transactions')
export class TransactionController {
  constructor(private service: TransactionService) {}

  // CREATE
  @Post()
  create(@Body() dto: CreateTransactionDto): Promise<Transaction> {
    return this.service.create(dto);
  }

  // GET ALL or BY SYMBOL
  @Get()
  findAll(@Query('symbol') symbol?: string): Promise<Transaction[]> {
    return this.service.findAll(symbol);
  }

  // UPDATE
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    return this.service.update(id, dto);
  }

  // DELETE
  @Delete(':id')
  remove(@Param('id') id: string): Promise<Transaction> {
    return this.service.remove(id);
  }

  @Delete('symbol/:symbol')
  removeBySymbol(@Param('symbol') symbol: string) {
    return this.service.deleteBySymbol(symbol);
  }
}
