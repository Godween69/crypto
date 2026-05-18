import React from 'react';
import type { UseFormRegisterReturn, FieldError } from 'react-hook-form'; 

interface Props {
  type: 'BUY' | 'SELL';
  disabled: boolean;
  sellAll: boolean;
  maxSellAmount: number;
  registerReturn: UseFormRegisterReturn<'amount'>;
  onSellAllChange: (checked: boolean) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  error?: FieldError;
}

export const AmountField = React.memo(({
  type, disabled, sellAll, maxSellAmount, registerReturn, onSellAllChange, onKeyDown, error
}: Props) => (
  <div className="form-field">
    <label htmlFor="tx-amount">Количество</label>
    {type === 'SELL' && (
      <label className="checkbox-row">
        <input type="checkbox" checked={sellAll} onChange={(e) => onSellAllChange(e.target.checked)} />
        Продать всё
      </label>
    )}
    <input
      id="tx-amount"
      type="number"
      step="any"
      autoComplete="off"
      disabled={disabled || sellAll}
      max={type === 'SELL' ? maxSellAmount : undefined}
      {...registerReturn}
      onKeyDown={onKeyDown}
    />
    {type === 'SELL' && <small>Доступно: {maxSellAmount}</small>}
    {error && <span className="field-error">{error.message}</span>}
  </div>
));