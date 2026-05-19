import React from 'react';
import type { UseFormRegisterReturn, FieldError } from 'react-hook-form';

interface Props {
  disabled: boolean;
  useMarketPrice: boolean;
  marketPrice: number;
  marketName?: string;
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
    {marketPrice > 0 && (
      <small className="market-hint">
        Цена: ${marketPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        {marketName && <span className="market-name"> • {marketName}</span>}
      </small>
    )}
    {error && <span className="field-error">{error.message}</span>}
  </div>
));