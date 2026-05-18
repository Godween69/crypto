// front/src/hooks/useDeleteTransaction.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteTransaction } from "../api/transaction.api";

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["portfolio"],
      });

      queryClient.invalidateQueries({
        queryKey: ["transactions"],
      });
    },
  });
};