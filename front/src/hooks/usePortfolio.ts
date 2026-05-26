// front/src/hooks/usePortfolio.ts

import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";
import type { PortfolioItem } from "../types/portfolio.types";

const getPortfolio = async (): Promise<PortfolioItem[]> => {
  const response = await api.get("/portfolio");
  return response.data;
};

export const usePortfolio = () => {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: ["portfolio", userId],
    queryFn: getPortfolio,
    staleTime: 60_000,
    // Запрос выполняется ТОЛЬКО при наличии userId
    enabled: !!userId,
  });
};
