import { Transaction as PrismaTransaction } from '@prisma/client';
import type { TransactionType } from '../types/transaction.types';
import { Transaction } from '@prisma/client';

function assertTransactionType(type: string): TransactionType {
  if (type === 'BUY' || type === 'SELL') return type;
  throw new Error(`Invalid transaction type: ${type}`);
}

export function toDomain(tx: PrismaTransaction): Transaction {
  return {
    id: tx.id,
    symbol: tx.symbol,
    type: assertTransactionType(tx.type),
    amount: tx.amount,
    price: tx.price,
    createdAt: tx.createdAt,
  };
}
