import React from 'react';
import type { UseFormRegisterReturn, FieldError } from 'react-hook-form';

interface Props {
  disabled: boolean;
  useMarketPrice: boolean;
  marketPrice: number;
  registerReturn: UseFormRegisterReturn<'price'>;
  onMarketPriceToggle: (checked: boolean) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  error?: FieldError;
}

export const PriceField = React.memo(({
  disabled, useMarketPrice, marketPrice, registerReturn, onMarketPriceToggle, onKeyDown, error
}: Props) => (
  <div className="form-field">
    <label>Цена</label>
    <label className="checkbox-row">
      <input type="checkbox" checked={useMarketPrice} onChange={(e) => onMarketPriceToggle(e.target.checked)} />
      Использовать рыночную цену
    </label>
    <input
      type="number"
      step="any"
      autoComplete="off"
      disabled={disabled || useMarketPrice}
      {...registerReturn}
      onKeyDown={onKeyDown}
    />
    {marketPrice > 0 && <small>Market: ${marketPrice.toFixed(2)}</small>}
    {error && <span className="field-error">{error.message}</span>}
  </div>
));