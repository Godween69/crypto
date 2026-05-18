import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form"; // ✅ useWatch вместо watch
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useCreateTransaction } from "../../hooks/useCreateTransaction";
import { usePortfolio } from "../../hooks/usePortfolio";
import { useMarketData } from "../../hooks/useMarketData";

const transactionSchema = z.object({
  symbol: z
    .string()
    .min(1, "Введите символ")
    .regex(/^[A-Z0-9]+$/, "Только A-Z и 0-9"),
  type: z.enum(["BUY", "SELL"]),
  amount: z.preprocess(
    (val) => (val === "" || val == null ? undefined : Number(val)),
    z
      .number({ invalid_type_error: "Введите число" })
      .positive("Должно быть больше 0"),
  ),
  price: z.preprocess(
    (val) => (val === "" || val == null ? undefined : Number(val)),
    z
      .number({ invalid_type_error: "Введите число" })
      .positive("Должно быть больше 0"),
  ),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;

export interface UseTransactionFormProps {
  symbol?: string;
  initialData?: Partial<TransactionFormValues>;
  onSuccess?: () => void;
  onClose?: () => void;
}

export const useTransactionForm = ({
  symbol,
  initialData,
  onSuccess,
  onClose,
}: UseTransactionFormProps) => {
  const { mutate, isPending, error } = useCreateTransaction();
  const { data: portfolio = [] } = usePortfolio();

  const [sellAll, setSellAll] = useState(false);
  const [useMarketPriceEnabled, setUseMarketPriceEnabled] = useState(true);
  const [fetchSymbol, setFetchSymbol] = useState(symbol ?? "");

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      symbol: symbol ?? initialData?.symbol ?? "",
      type: initialData?.type ?? "BUY",
      amount: initialData?.amount,
      price: initialData?.price,
    },
  });

  const { setValue, setError, clearErrors, setFocus, handleSubmit } = form;

  // ✅ useWatch безопасен для React Compiler (подписка через React-хук, а не императивную функцию)
  const type = useWatch({ control: form.control, name: "type" });
  const selectedSymbol = useWatch({ control: form.control, name: "symbol" });
  const amount = useWatch({ control: form.control, name: "amount" });

  const currentPosition = portfolio.find((i) => i.symbol === selectedSymbol);
  const maxSellAmount = currentPosition?.amount ?? 0;
  const sellableAssets = useMemo(
    () => portfolio.filter((i) => i.amount > 0),
    [portfolio],
  );

  const { data: marketData = [] } = useMarketData(
    fetchSymbol ? [fetchSymbol] : [],
  );
  const marketPrice = marketData[0]?.currentPrice ?? 0;

  useEffect(() => {
    if (type === "SELL" && sellAll) setValue("amount", maxSellAmount);
  }, [type, sellAll, maxSellAmount, setValue]);

  useEffect(() => {
    if (useMarketPriceEnabled && marketPrice > 0)
      setValue("price", marketPrice);
  }, [marketPrice, useMarketPriceEnabled, setValue]);

  useEffect(() => {
    if (type === "SELL" && amount > maxSellAmount) {
      setError("amount", {
        type: "manual",
        message: "Недостаточно актива в портфеле",
      });
    } else {
      clearErrors("amount");
    }
  }, [type, amount, maxSellAmount, setError, clearErrors]);

  const triggerMarketFetch = (value: string) =>
    setFetchSymbol(value.toUpperCase());
  const handleSellAllChange = (checked: boolean) => setSellAll(checked);
  const handleMarketPriceToggle = (checked: boolean) =>
    setUseMarketPriceEnabled(checked);

  const onSubmit = handleSubmit((data) => {
    if (data.type === "SELL" && data.amount > maxSellAmount) {
      setError("amount", { type: "manual", message: "Недостаточно актива" });
      return;
    }
    mutate(data, {
      onSuccess: () => {
        form.reset();
        onSuccess?.();
        onClose?.();
      },
    });
  });

  return {
    form,
    state: {
      type,
      selectedSymbol,
      amount,
      sellAll,
      useMarketPriceEnabled,
      marketPrice,
      maxSellAmount,
      sellableAssets,
      isPending,
      error,
    },
    handlers: {
      onSubmit,
      triggerMarketFetch,
      handleSellAllChange,
      handleMarketPriceToggle,
      // ✅ Нативная фокусировка RHF. Не требует кастомных рефов.
      focusNext: (field: keyof TransactionFormValues) => setFocus(field),
    },
  };
};
