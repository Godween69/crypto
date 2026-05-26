// front/src/hooks/useCreateTransaction.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTransaction } from "../api/transaction.api";
import { useAuthStore } from "../store/authStore";

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  // Получаем ID текущего пользователя для изоляции кэша
  const userId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: createTransaction,
    onSuccess: (_, variables) => {
      console.log(
        `[CreateTx] Успех для userId=${userId}, символ=${variables.symbol}`,
      );

      // Инвалидируем кэш ТОЛЬКО текущего пользователя
      queryClient.invalidateQueries({ queryKey: ["portfolio", userId] });
      queryClient.invalidateQueries({
        queryKey: ["transactions", userId, variables.symbol],
      });
      queryClient.invalidateQueries({ queryKey: ["portfolio-index", userId] });

      // Диспатчим событие для компонентов, слушающих его напрямую
      window.dispatchEvent(new CustomEvent("portfolio:transaction:success"));
    },
  });
};
