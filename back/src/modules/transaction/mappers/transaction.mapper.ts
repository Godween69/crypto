// back/src/modules/transaction/mappers/transaction.mapper.ts

import { Transaction as PrismaTransaction } from '@prisma/client';
import type { TransactionType } from '../types/transaction.types';

// Валидация типа транзакции: защищает от некорректных значений из БД
function assertTransactionType(type: string): TransactionType {
  if (type === 'BUY' || type === 'SELL') return type;
  throw new Error(`Invalid transaction type: ${type}`);
}

// Маппер из Prisma-модели в доменный тип: исключает userId из ответа фронтенду
export function toDomain(tx: PrismaTransaction) {
  return {
    id: tx.id,
    symbol: tx.symbol,
    type: assertTransactionType(tx.type),
    amount: tx.amount,
    price: tx.price,
    createdAt: tx.createdAt,
  };
}
