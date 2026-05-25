// front/src/components/TransactionForm/useSymbolValidation.ts

import { useMemo, useState } from "react";
import type { MarketData } from "../../types/portfolio.types";

export type TickerStatus =
  | "idle"
  | "verifying"
  | "found"
  | "not-found"
  | "not-checked";

interface UseSymbolValidationParams {
  selectedSymbol: string;
  fetchSymbol: string;
  marketData: MarketData[];
  type: "BUY" | "SELL";
  isInPortfolio: boolean;
  setFetchSymbol: (s: string) => void;
}

export const useSymbolValidation = ({
  selectedSymbol,
  fetchSymbol,
  marketData,
  type,
  isInPortfolio,
  setFetchSymbol,
}: UseSymbolValidationParams) => {
  const [isVerifyingSymbol, setIsVerifyingSymbol] = useState(false);

  // Ищем монету строго по fetchSymbol
  const matchedMarketItem = useMemo(
    () => marketData.find((m) => m.symbol === fetchSymbol),
    [marketData, fetchSymbol],
  );

  const marketPrice = matchedMarketItem?.currentPrice ?? 0;

  const marketName = useMemo(() => {
    if (!matchedMarketItem) return "";
    if (matchedMarketItem.name) return matchedMarketItem.name;
    if (matchedMarketItem.coinId) {
      return matchedMarketItem.coinId
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
    return "";
  }, [matchedMarketItem]);

  // Корректировка состояния во время рендера (React Purity)
  if (isVerifyingSymbol && fetchSymbol === selectedSymbol) {
    setIsVerifyingSymbol(false);
  }

  // Статус тикера для UI
  const tickerStatus: TickerStatus = useMemo(() => {
    if (!selectedSymbol) return "idle";
    if (type === "SELL" && isInPortfolio) return "found";
    if (type === "BUY" && selectedSymbol !== fetchSymbol) return "not-checked";
    if (isVerifyingSymbol) return "verifying";
    if (matchedMarketItem && marketPrice > 0) return "found";
    if (fetchSymbol === selectedSymbol) return "not-found";
    return "idle";
  }, [
    selectedSymbol,
    fetchSymbol,
    matchedMarketItem,
    marketPrice,
    type,
    isInPortfolio,
    isVerifyingSymbol,
  ]);

  const symbolFieldError = useMemo(() => {
    if (!selectedSymbol) return undefined;
    if (tickerStatus === "not-checked")
      return "Нажмите Tab или кликните вне поля для проверки тикера";
    if (tickerStatus === "not-found")
      return `Тикер "${selectedSymbol}" не найден на CoinGecko`;
    if (type === "SELL" && !isInPortfolio)
      return `У вас нет ${selectedSymbol} в портфеле для продажи`;
    return undefined;
  }, [selectedSymbol, tickerStatus, type, isInPortfolio]);

  const isSymbolVerified = tickerStatus === "found";

  const triggerMarketFetch = (value: string) => {
    const normalized = value.toUpperCase().trim();
    if (normalized && normalized !== fetchSymbol) {
      setIsVerifyingSymbol(true);
    }
    setFetchSymbol(normalized);
  };

  const validateBeforeSubmit = (dataSymbol: string): string | null => {
    if (type === "SELL" && !isInPortfolio) {
      return `У вас нет ${dataSymbol} в портфеле для продажи`;
    }
    if (type === "BUY" && dataSymbol !== fetchSymbol) {
      setFetchSymbol(dataSymbol);
      setIsVerifyingSymbol(true);
      return "Проверяем тикер на рынке... повторите сохранение";
    }
    if (type === "BUY" && (!matchedMarketItem || marketPrice === 0)) {
      return `Тикер "${dataSymbol}" не найден на CoinGecko. Транзакция не может быть сохранена.`;
    }
    return null;
  };

  return {
    matchedMarketItem,
    marketPrice,
    marketName,
    tickerStatus,
    symbolFieldError,
    isSymbolVerified,
    isVerifyingSymbol,
    triggerMarketFetch,
    validateBeforeSubmit,
  };
};
