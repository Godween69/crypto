// front/src/api/transaction.api.ts

import { api } from "./client";

import type { CreateTransactionDto } from "../types/transaction.types";

export const createTransaction = async (dto: CreateTransactionDto) => {
  const response = await api.post("/transactions", dto);

  return response.data;
};

export const updateTransaction = async (
  id: string,
  dto: Partial<CreateTransactionDto>,
) => {
  const response = await api.patch(`/transactions/${id}`, dto);

  return response.data;
};

export const deleteTransaction = async (id: string) => {
  const response = await api.delete(`/transactions/${id}`);

  return response.data;
};

export const getTransactionsBySymbol = async (symbol: string) => {
  const response = await api.get(`/transactions?symbol=${symbol}`);
  return response.data;
};

export const deletePortfolioItem = async (symbol: string) => {
  const { data } = await api.delete(`/transactions/symbol/${symbol}`);
  return data;
};
