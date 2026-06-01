// front/src/hooks/useDeleteTransaction.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteTransaction } from "../api/transaction.api";
import { useAuthStore } from "../store/authStore";

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      console.log("[DeleteTx] Успех, инвалидация кэша");
      queryClient.invalidateQueries({ queryKey: ["portfolio", userId] });
      queryClient.invalidateQueries({ queryKey: ["transactions", userId] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-index", userId] });
      window.dispatchEvent(new CustomEvent("portfolio:transaction:success"));
    },
  });
};
