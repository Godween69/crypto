// front/src/hooks/useDeletePortfolioItem.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deletePortfolioItem } from "../api/transaction.api";

export const useDeletePortfolioItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePortfolioItem,

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