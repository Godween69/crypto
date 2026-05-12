import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createTransaction } from "../api/transaction.api";

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransaction,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["portfolio"],
      });
    },
  });
};
