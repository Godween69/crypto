// front/src/hooks/useMarketData.ts

import { useQuery } from "@tanstack/react-query";
import { getMarketData } from "../api/market.api";

export const useMarketData = (symbols: string[]) => {
  // Создаём копию перед сортировкой, чтобы не мутировать входные данные в фазе рендера
  const sortedKey = [...symbols].sort().join(",");

  return useQuery({
    // Детерминированный ключ: порядок символов не влияет на кэш
    queryKey: ["market", sortedKey],
    // Бэкенд самостоятельно нормализует порядок для резолвинга
    queryFn: () => getMarketData(symbols),
    // Запрос уходит только при наличии тикеров, предотвращает пустые вызовы
    enabled: symbols.length > 0,
    // Данные считаются свежими 1 минуту
    staleTime: 60_000,
  });
};
