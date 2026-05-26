// front/src/store/authStore.ts

import { create } from "zustand";
import { api } from "../api/client";
import { AxiosError } from "axios";

interface User {
  id: string;
  email: string;
  displayName?: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;

  checkAuth: () => Promise<void>;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  // Новые методы для сброса пароля
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
}

// Безопасное извлечение сообщения и формирование корректной причины типа Error
function extractErrorInfo(
  err: unknown,
  fallback: string,
): { message: string; cause: Error } {
  if (err instanceof AxiosError && err.response?.data) {
    const data = err.response.data as { message?: string | string[] };
    if (typeof data.message === "string") {
      return { message: data.message, cause: new Error(data.message) };
    }
    if (Array.isArray(data.message)) {
      const msg = data.message.join(", ");
      return { message: msg, cause: new Error(msg) };
    }
  }
  if (err instanceof Error) {
    return { message: err.message, cause: err };
  }
  return { message: fallback, cause: new Error(fallback) };
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,

  checkAuth: async () => {
    console.log("[AuthStore] Начало проверки сессии...");
    try {
      await api.post("/auth/refresh");
      const meResponse = await api.get<{ id: string; email: string }>(
        "/auth/me",
      );
      const { id, email } = meResponse.data;
      console.log(`[AuthStore] Сессия валидна, пользователь: ${email} (${id})`);
      set({
        isAuthenticated: true,
        isLoading: false,
        user: { id, email },
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.log("[AuthStore] Сессия не найдена или истекла:", err.message);
      } else {
        console.log(
          "[AuthStore] Сессия не найдена или истекла: неизвестная ошибка",
        );
      }
      set({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      });
    }
  },

  login: async (email: string, password: string, rememberMe = false) => {
    console.log(`[AuthStore] Попытка входа: ${email}, remember: ${rememberMe}`);
    try {
      await api.post("/auth/login", { email, password, rememberMe });
      const meResponse = await api.get<{ id: string; email: string }>(
        "/auth/me",
      );
      const { id, email: confirmedEmail } = meResponse.data;
      console.log(`[AuthStore] Вход успешен: ${confirmedEmail} (${id})`);
      set({
        isAuthenticated: true,
        isLoading: false,
        user: { id, email: confirmedEmail },
      });
    } catch (err: unknown) {
      const { message } = extractErrorInfo(err, "Неверный email или пароль");
      console.error(`[AuthStore] Ошибка входа: ${message}`);
    }
  },

  register: async (email: string, password: string, displayName: string) => {
    console.log(`[AuthStore] Попытка регистрации: ${email}`);
    try {
      await api.post("/auth/register", { email, password, displayName });
      const meResponse = await api.get<{ id: string; email: string }>(
        "/auth/me",
      );
      const { id, email: confirmedEmail } = meResponse.data;
      console.log(`[AuthStore] Регистрация успешна: ${confirmedEmail} (${id})`);
      set({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id,
          email: confirmedEmail,
          displayName,
        },
      });
    } catch (err: unknown) {
      const { message } = extractErrorInfo(err, "Ошибка регистрации");
      console.error(`[AuthStore] Ошибка регистрации: ${message}`);
    }
  },

  logout: async () => {
    console.log("[AuthStore] Выход из системы...");
    try {
      await api.post("/auth/logout");
      console.log("[AuthStore] Запрос выхода выполнен успешно");
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("[AuthStore] Ошибка при запросе выхода:", err.message);
      } else {
        console.error(
          "[AuthStore] Ошибка при запросе выхода: неизвестная ошибка",
        );
      }
    } finally {
      set({ isAuthenticated: false, user: null, isLoading: false });
      console.log("[AuthStore] Состояние сброшено, редирект на /login");
      window.location.href = "/login";
    }
  },

  // Запрос сброса пароля
  forgotPassword: async (email: string) => {
    console.log(`[AuthStore] Запрос сброса пароля для: ${email}`);
    try {
      await api.post("/auth/forgot-password", { email });
      console.log(`[AuthStore] Запрос сброса пароля отправлен`);
    } catch (err: unknown) {
      const { message } = extractErrorInfo(err, "Ошибка отправки");
      console.error(`[AuthStore] Ошибка forgotPassword: ${message}`);
    }
  },

  // Сброс пароля по токену
  resetPassword: async (token: string, password: string) => {
    console.log(`[AuthStore] Сброс пароля по токену`);
    try {
      await api.post("/auth/reset-password", { token, password });
      console.log(`[AuthStore] Пароль успешно сброшен`);
    } catch (err: unknown) {
      const { message } = extractErrorInfo(
        err,
        "Токен недействителен или истёк",
      );
      console.error(`[AuthStore] Ошибка resetPassword: ${message}`);
    }
  },
}));
