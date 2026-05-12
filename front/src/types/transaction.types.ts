export type TransactionType = "BUY" | "SELL";

export type CreateTransactionDto = {
  symbol: string;
  type: TransactionType;
  amount: number;
  price: number;
};

export type Transaction = {
  id: string;
  symbol: string;
  type: TransactionType;
  amount: number;
  price: number;
  createdAt: string;
};
