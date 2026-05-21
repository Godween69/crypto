// front/src/hooks/useMarketData.ts
import { useQuery } from "@tanstack/react-query";
import { getMarketData } from "../api/market.api";

export const useMarketData = (symbols: string[]) => {
  // создаём копию перед сортировкой, чтобы не мутировать входные данные в фазе рендера
  const sortedKey = [...symbols].sort().join(",");

  return useQuery({
    // детерминированный ключ, порядок символов не влияет на кэш
    queryKey: ["market", sortedKey],
    // бэкенд самостоятельно нормализует порядок для резолвинга
    queryFn: () => getMarketData(symbols),
    // запрос уходит только при наличии тикеров, предотвращает пустые вызовы
    enabled: symbols.length > 0,
    // данные считаются свежими 1 минуту
    staleTime: 60_000,
  });
};
