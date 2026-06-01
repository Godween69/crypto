// back/src/providers/market-provider.interface.ts

import { MarketData } from '../modules/market/types/market.types';

// Контракт любого источника рыночных данных.
// Провайдер получает список символов и возвращает
// нормализованные данные в едином формате MarketData.
export interface MarketDataProvider {
  // Имя провайдера для логов и мониторинга
  readonly name: string;

  // Получение рыночных данных для списка символов.
  // Возвращает только найденные монеты.
  fetch(symbols: string[]): Promise<MarketData[]>;
}