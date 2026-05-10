import { Controller, Get, Post, Body } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Transaction } from './types/transaction.types';

@Controller('transactions')
export class TransactionController {
  constructor(private service: TransactionService) {}

  @Post()
  create(@Body() dto: CreateTransactionDto): Promise<Transaction> {
    return this.service.create(dto);
  }

  @Get()
  findAll(): Promise<Transaction[]> {
    return this.service.findAll();
  }
}
