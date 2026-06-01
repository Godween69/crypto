// back/src/modules/transaction/dto/transaction-response.dto.ts

import { TransactionType } from '../types/transaction.types';

// DTO для ответа API: не содержит userId и внутренние поля БД
export class TransactionResponseDto {
  id!: string; // !: утверждает, что поле будет инициализировано вне конструктора
  symbol!: string;
  type!: TransactionType;
  amount!: number;
  price!: number;
  createdAt!: Date;
}
