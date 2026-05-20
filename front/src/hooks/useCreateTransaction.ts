// hooks/useCreateTransaction.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTransaction } from "../api/transaction.api";

export const useCreateTransaction = () => {
  const queryClient = useQueryClient(); // 🔹 Доступ к кэшу React Query

  return useMutation({
    mutationFn: createTransaction,

    // onSuccess получает (data, variables) variables это то, что отправили в мутацию
    onSuccess: (_, variables) => {
      // Обновляем портфель (балансы изменились)
      queryClient.invalidateQueries({
        queryKey: ["portfolio"], 
      });

      // Обновляем список транзакций для конкретного символа
      // Должно точно совпадать с queryKey в useTransactions(symbol)
      queryClient.invalidateQueries({
        queryKey: ["transactions", variables.symbol], 
      });
    },
  });
};
