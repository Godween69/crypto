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
import { TransactionResponseDto } from './dto/transaction-response.dto';

@Controller('transactions')
export class TransactionController {
  constructor(private service: TransactionService) {}

  // CREATE
  @Post()
  create(@Body() dto: CreateTransactionDto): Promise<TransactionResponseDto> {
    return this.service.create(dto);
  }

  // GET ALL or BY SYMBOL
  @Get()
  findAll(@Query('symbol') symbol?: string): Promise<TransactionResponseDto[]> {
    return this.service.findAll(symbol);
  }

  // UPDATE
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<TransactionResponseDto> {
    return this.service.update(id, dto);
  }

  // DELETE
  @Delete(':id')
  remove(@Param('id') id: string): Promise<TransactionResponseDto> {
    return this.service.remove(id);
  }

  // DELETE BY SYMBOL
  @Delete('symbol/:symbol')
  removeBySymbol(@Param('symbol') symbol: string): Promise<void> {
    return this.service.deleteBySymbol(symbol);
  }
}
