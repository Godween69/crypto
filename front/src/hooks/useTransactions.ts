// front/src/hooks/useTransactions.ts

import { useQuery } from "@tanstack/react-query";
import { getTransactionsBySymbol } from "../api/transaction.api";
import { useAuthStore } from "../store/authStore";
import type { Transaction } from "../types/transaction.types";

export const useTransactions = (symbol: string) => {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery<Transaction[]>({
    queryKey: ["transactions", userId, symbol],
    queryFn: () => getTransactionsBySymbol(symbol),
    enabled: !!symbol && !!userId,
  });
};
