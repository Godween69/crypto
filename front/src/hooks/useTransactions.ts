import { useQuery } from "@tanstack/react-query";
import { getTransactionsBySymbol } from "../api/transaction.api";
import type { Transaction } from "../types/transaction.types";

export const useTransactions = (symbol: string) => {
  return useQuery<Transaction[]>({
    queryKey: ["transactions", symbol],
    queryFn: () => getTransactionsBySymbol(symbol),
    enabled: !!symbol,
  });
};
