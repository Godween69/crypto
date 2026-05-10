export type TransactionType = 'BUY' | 'SELL';

export interface Transaction {
  id: string;
  symbol: string;
  type: TransactionType;
  amount: number;
  price: number;
  createdAt: Date;
}
