// front/src/api/market.api.ts

import { api } from "./client";
import type { MarketData } from "../types/portfolio.types";

export const getMarketData = async (
  symbols: string[],
): Promise<MarketData[]> => {
  const response = await api.get("/market", {
    params: {
      symbols: symbols.join(","),
    },
  });

  return Array.isArray(response.data) ? response.data : [];
};
