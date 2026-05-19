import React from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

interface Props {
  type: 'BUY' | 'SELL';
  disabled: boolean;
  sellableAssets: { symbol: string; amount: number }[];
  registerReturn: UseFormRegisterReturn<'symbol'>;
  onBlurTrigger: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export const SymbolField = React.memo(({
  type, disabled, sellableAssets, registerReturn, onBlurTrigger, onKeyDown
}: Props) => {
  return (
    <div className="form-field">
      <label htmlFor="tx-symbol">Символ</label>
      {type === 'SELL' ? (
        <select
          id="tx-symbol"
          disabled={disabled}
          {...registerReturn}
          onChange={(e) => {
            registerReturn.onChange(e);
            onBlurTrigger(e.target.value);
          }}
          onKeyDown={onKeyDown}
        >
          {sellableAssets.map((asset) => (
            <option key={asset.symbol} value={asset.symbol} >
              {asset.symbol} {`(${asset.amount} монет)`}
            </option>
          ))}
        </select>
      ) : (
        <input
          id="tx-symbol"
          placeholder="BTC"
          autoComplete="off"
          disabled={disabled}
          className="input-uppercase"
          {...registerReturn}
          onChange={(e) => {
            e.target.value = e.target.value.toUpperCase();
            registerReturn.onChange(e);
          }}
          onBlur={(e) => {
            onBlurTrigger(e.target.value);
            registerReturn.onBlur(e);
          }}
          onKeyDown={onKeyDown}
        />
      )
      }
    </div >
  );
});