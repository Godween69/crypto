// front/src/hooks/useUpdateTransaction.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTransaction } from "../api/transaction.api";
import { useAuthStore } from "../store/authStore";
import type { CreateTransactionDto } from "../types/transaction.types";

interface UpdateTransactionPayload {
  id: string;
  dto: Partial<CreateTransactionDto>;
}

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: ({ id, dto }: UpdateTransactionPayload) =>
      updateTransaction(id, dto),
    onSuccess: () => {
      console.log("[UpdateTx] Успех, инвалидация кэша");
      queryClient.invalidateQueries({ queryKey: ["portfolio", userId] });
      queryClient.invalidateQueries({ queryKey: ["transactions", userId] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-index", userId] });
      window.dispatchEvent(new CustomEvent("portfolio:transaction:success"));
    },
  });
};