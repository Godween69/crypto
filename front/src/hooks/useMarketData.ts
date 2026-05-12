// front/src/hooks/useMarketData.ts

import { useQuery } from "@tanstack/react-query";
import { getMarketData } from "../api/market.api";

export const useMarketData = (symbols: string[]) => {
  return useQuery({
    queryKey: ["market", symbols.sort().join(",")],
    queryFn: () => getMarketData(symbols),
    enabled: symbols.length > 0,
    staleTime: 60_000, // защита от лимитов CoinGecko
  });
};
