// front/src/components/TransactionForm/TransactionForm.tsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { useCreateTransaction } from '../../hooks/useCreateTransaction';

import './TransactionForm.css';

const transactionSchema = z.object({
  symbol: z
    .string()
    .min(1)
    .regex(/^[A-Za-z0-9]+$/),

  type: z.enum(['BUY', 'SELL']),

  amount: z.coerce.number().positive(),

  price: z.coerce.number().positive(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  symbol?: string; // 👈 контекст страницы
  initialData?: Partial<TransactionFormValues>;
  onSuccess?: () => void;
  onClose?: () => void;
}

export const TransactionForm = ({
  symbol,
  initialData,
  onSuccess,
  onClose,
}: TransactionFormProps) => {
  const { mutate, isPending, error } =
    useCreateTransaction();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),

    defaultValues: {
      symbol:
        symbol ??
        initialData?.symbol ??
        '',

      type: initialData?.type ?? 'BUY',

      amount: initialData?.amount ?? undefined,

      price: initialData?.price ?? undefined,
    },
  });

  const onSubmit = (data: TransactionFormValues) => {
    mutate(data, {
      onSuccess: () => {
        reset();
        onSuccess?.();
        onClose?.();
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="transaction-form"
    >
      {/* SYMBOL */}
      <div className="form-field">
        <label>Символ</label>

        <input
          placeholder="BTC"
          disabled={isPending || !!symbol}
          {...register('symbol')}
        />

        {errors.symbol && (
          <span className="field-error">
            {errors.symbol.message}
          </span>
        )}
      </div>

      {/* TYPE */}
      <div className="form-field">
        <label>Тип</label>

        <select
          disabled={isPending}
          {...register('type')}
        >
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>
      </div>

      {/* AMOUNT */}
      <div className="form-field">
        <label>Количество</label>

        <input
          type="number"
          step="any"
          disabled={isPending}
          {...register('amount')}
        />
      </div>

      {/* PRICE */}
      <div className="form-field">
        <label>Цена</label>

        <input
          type="number"
          step="any"
          disabled={isPending}
          {...register('price')}
        />
      </div>

      {/* ERROR */}
      {error && (
        <div className="mutation-error">
          {error.message}
        </div>
      )}

      {/* SUBMIT */}
      <button
        type="submit"
        disabled={isPending}
      >
        {isPending
          ? 'Сохранение...'
          : 'Сохранить'}
      </button>
    </form>
  );
};