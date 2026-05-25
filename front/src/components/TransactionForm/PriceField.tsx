// front/src/components/TransactionForm/PriceField.tsx

import React from 'react';
import type { UseFormRegisterReturn, FieldError } from 'react-hook-form';
import type { TickerStatus } from './useSymbolValidation';

interface Props {
  disabled: boolean;
  useMarketPrice: boolean;
  marketPrice: number;
  marketName?: string;
  tickerStatus: TickerStatus;
  registerReturn: UseFormRegisterReturn<'price'>;
  onMarketPriceToggle: (checked: boolean) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  error?: FieldError;
}

export const PriceField = React.memo(({
  disabled,
  useMarketPrice,
  marketPrice,
  marketName,
  tickerStatus,
  registerReturn,
  onMarketPriceToggle,
  onKeyDown,
  error,
}: Props) => (
  <div className="form-field">
    <label htmlFor="tx-price">Цена</label>
    <label className="checkbox-row">
      <input
        type="checkbox"
        checked={useMarketPrice}
        onChange={(e) => onMarketPriceToggle(e.target.checked)}
      />
      Использовать рыночную цену
    </label>
    <input
      id="tx-price"
      type="number"
      step="any"
      autoComplete="off"
      disabled={disabled || useMarketPrice}
      {...registerReturn}
      onKeyDown={onKeyDown}
    />

    {/* 🔥 Красное сообщение когда тикер не найден */}
    {tickerStatus === 'not-found' && (
      <small className="market-hint market-hint-error">
        Нет такого тикера на рынке
      </small>
    )}

    {/* Зелёная подсказка с ценой когда тикер найден */}
    {tickerStatus === 'found' && marketPrice > 0 && (
      <small className="market-hint">
        Цена: ${marketPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        {marketName && <span className="market-name"> • {marketName}</span>}
      </small>
    )}

    {tickerStatus === 'verifying' && (
      <small className="market-hint market-hint-verifying">
        Проверяем тикер на рынке...
      </small>
    )}

    {tickerStatus === 'not-checked' && (
      <small className="market-hint market-hint-info">
        Нажмите Tab для проверки тикера
      </small>
    )}

    {error && <span className="field-error">{error.message}</span>}
  </div>
));