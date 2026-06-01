// front/src/components/TransactionForm/useTransactionForm.ts

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useCreateTransaction } from "../../hooks/useCreateTransaction";
import { usePortfolio } from "../../hooks/usePortfolio";
import { useMarketData } from "../../hooks/useMarketData";
import { useSymbolValidation } from "./useSymbolValidation";

const computeTodayDate = () => new Date().toISOString().split("T")[0];

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
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Формат: ГГГГ-ММ-ДД"),
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
  const [useTodayDate, setUseTodayDate] = useState(true);

  // Исправлено: добавлены зависимости для корректного обновления defaultValues
  const defaultValues = useMemo(
    () => ({
      symbol: symbol ?? initialData?.symbol ?? "",
      type: (initialData?.type ?? "BUY") as "BUY" | "SELL",
      amount: initialData?.amount,
      price: initialData?.price,
      date: initialData?.date ?? computeTodayDate(),
    }),
    [
      symbol,
      initialData?.symbol,
      initialData?.type,
      initialData?.amount,
      initialData?.price,
      initialData?.date,
    ],
  );

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues,
  });

  const { setValue, setError, clearErrors, setFocus, handleSubmit } = form;

  const type = useWatch({ control: form.control, name: "type" });
  const selectedSymbol = useWatch({ control: form.control, name: "symbol" });
  const amount = useWatch({ control: form.control, name: "amount" });

  const sellableAssets = useMemo(
    () => portfolio.filter((i) => i.amount > 0),
    [portfolio],
  );
  const isInPortfolio = sellableAssets.some((a) => a.symbol === selectedSymbol);
  const maxSellAmount =
    portfolio.find((i) => i.symbol === selectedSymbol)?.amount ?? 0;

  const { data: marketData = [] } = useMarketData(
    fetchSymbol ? [fetchSymbol] : [],
  );

  const {
    marketPrice,
    marketName,
    tickerStatus,
    symbolFieldError,
    isSymbolVerified,
    isVerifyingSymbol,
    triggerMarketFetch,
    validateBeforeSubmit,
  } = useSymbolValidation({
    selectedSymbol,
    fetchSymbol,
    marketData,
    type,
    isInPortfolio,
    setFetchSymbol,
  });

  // Синхронизация с RHF (внешняя система)
  useEffect(() => {
    if (type === "SELL" && sellAll) setValue("amount", maxSellAmount);
  }, [type, sellAll, maxSellAmount, setValue]);

  useEffect(() => {
    if (useMarketPriceEnabled && marketPrice > 0)
      setValue("price", marketPrice);
  }, [marketPrice, useMarketPriceEnabled, setValue]);

  useEffect(() => {
    if (useTodayDate) setValue("date", computeTodayDate());
  }, [useTodayDate, setValue]);

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

  useEffect(() => {
    if (symbolFieldError)
      setError("symbol", { type: "manual", message: symbolFieldError });
    else clearErrors("symbol");
  }, [symbolFieldError, setError, clearErrors]);

  const onSubmit = handleSubmit((data) => {
    if (data.type === "SELL" && data.amount > maxSellAmount) {
      setError("amount", { type: "manual", message: "Недостаточно актива" });
      return;
    }
    const validationError = validateBeforeSubmit(data.symbol);
    if (validationError) {
      setError("symbol", { type: "manual", message: validationError });
      return;
    }

    const today = computeTodayDate();
    mutate(
      {
        symbol: data.symbol,
        type: data.type,
        amount: Number(data.amount),
        price: Number(data.price),
        ...(data.date !== today && { date: data.date }),
      },
      {
        onSuccess: () => {
          window.dispatchEvent(
            new CustomEvent("portfolio:transaction:success"),
          );
          form.reset();
          onSuccess?.();
          onClose?.();
        },
      },
    );
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
      marketName,
      tickerStatus,
      maxSellAmount,
      sellableAssets,
      isPending,
      error,
      useTodayDate,
      isSymbolVerified,
      isVerifyingSymbol,
      isSubmitDisabled:
        isPending ||
        !isSymbolVerified ||
        isVerifyingSymbol ||
        !!symbolFieldError,
    },
    handlers: {
      onSubmit,
      triggerMarketFetch,
      handleSellAllChange: (c: boolean) => setSellAll(c),
      handleMarketPriceToggle: (c: boolean) => setUseMarketPriceEnabled(c),
      handleUseTodayDateToggle: (c: boolean) => setUseTodayDate(c),
      focusNext: (field: keyof TransactionFormValues) => setFocus(field),
    },
  };
};
