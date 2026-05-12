// front/src/hooks/useUpdateTransaction.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateTransaction } from "../api/transaction.api";

import type { CreateTransactionDto } from "../types/transaction.types";

interface UpdateTransactionPayload {
  id: string;
  dto: Partial<CreateTransactionDto>;
}

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: UpdateTransactionPayload) =>
      updateTransaction(id, dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["portfolio"],
      });
    },
  });
};
