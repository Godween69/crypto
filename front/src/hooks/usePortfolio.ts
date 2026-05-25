// front/src/hooks/usePortfolio.ts

import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { PortfolioItem } from "../types/portfolio.types";

const getPortfolio = async (): Promise<PortfolioItem[]> => {
  const response = await api.get("/portfolio");
  return response.data;
};

export const usePortfolio = () => {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: getPortfolio,
    staleTime: 60_000, // 60 сек кэш, инвалидируется через WS/события
  });
};
