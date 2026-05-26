// front/src/hooks/useDeletePortfolioItem.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deletePortfolioItem } from "../api/transaction.api";
import { useAuthStore } from "../store/authStore";

export const useDeletePortfolioItem = () => {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: deletePortfolioItem,
    onSuccess: () => {
      console.log("[DeletePortfolioItem] Успех, инвалидация кэша");
      queryClient.invalidateQueries({ queryKey: ["portfolio", userId] });
      queryClient.invalidateQueries({ queryKey: ["transactions", userId] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-index", userId] });
      window.dispatchEvent(new CustomEvent("portfolio:transaction:success"));
    },
  });
};
