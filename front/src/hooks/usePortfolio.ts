// front/src/hooks/usePortfolio.ts

import { useQuery } from "@tanstack/react-query";
import { getPortfolio } from "../api/portfolio.api";

export const usePortfolio = () => {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: getPortfolio,
  });
};
