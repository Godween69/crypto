import { useTransactionForm, type TransactionFormValues } from './useTransactionForm';
import { SymbolField } from './SymbolField';
import { AmountField } from './AmountField';
import { PriceField } from './PriceField';
import './TransactionForm.css';

interface Props {
  symbol?: string;
  initialData?: Partial<TransactionFormValues>;
  onSuccess?: () => void;
  onClose?: () => void;
}

export const TransactionForm = ({ symbol, initialData, onSuccess, onClose }: Props) => {
  const { form, state, handlers } = useTransactionForm({ symbol, initialData, onSuccess, onClose });
  const { register, formState: { errors } } = form;

  return (
    <form className="transaction-form" onSubmit={handlers.onSubmit}>
      <SymbolField
        type={state.type}
        disabled={state.isPending || !!symbol}
        sellableAssets={state.sellableAssets}
        registerReturn={register('symbol')}
        onBlurTrigger={handlers.triggerMarketFetch}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handlers.focusNext('type'))}
      />

      <div className="form-field">
        <label htmlFor="tx-type">Тип</label>
        {/* ✅ {...register('type')} больше не конфликтует с кастомным ref */}
        <select
          id="tx-type"
          disabled={state.isPending}
          {...register('type')}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handlers.focusNext('amount'))}
        >
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>
      </div>

      <AmountField
        type={state.type}
        disabled={state.isPending}
        sellAll={state.sellAll}
        maxSellAmount={state.maxSellAmount}
        registerReturn={register('amount')}
        onSellAllChange={handlers.handleSellAllChange}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handlers.focusNext('price'))}
        error={errors.amount}
      />

      <PriceField
        disabled={state.isPending}
        useMarketPrice={state.useMarketPriceEnabled}
        marketPrice={state.marketPrice}
        registerReturn={register('price')}
        onMarketPriceToggle={handlers.handleMarketPriceToggle}
        // ✅ Enter на последнем поле вызывает сабмит формы
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handlers.onSubmit())}
        error={errors.price}
      />

      {state.error && <div className="mutation-error">{state.error.message}</div>}

      <button type="submit" disabled={state.isPending || !!errors.amount}>
        {state.isPending ? 'Сохранение...' : 'Сохранить'}
      </button>
    </form>
  );
};