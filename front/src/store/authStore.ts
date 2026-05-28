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
  // Регистрация больше НЕ логи автоматически. Возвращает сообщение для UI.
  register: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<string>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  // Новые методы для верификации email
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<string>;
}

// Извлекаем сообщение об ошибке из ответа сервера
function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError && err.response?.data) {
    const data = err.response.data as { message?: string | string[] };
    if (typeof data.message === "string") return data.message;
    if (Array.isArray(data.message)) return data.message.join(", ");
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

// Хелпер для создания ошибок с cause (обходит строгие правила линтера)
function createError(message: string, cause?: unknown): Error {
  const error = new Error(message);
  if (cause !== undefined) error.cause = cause;
  return error;
}

// 🔒 Lock-механизм для предотвращения двойного refresh при React StrictMode
let refreshPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,

  // Проверка сессии с lock: если уже идёт refresh, возвращаем тот же промис
  checkAuth: async () => {
    if (refreshPromise) {
      console.log("[AuthStore] checkAuth уже выполняется, ждём результат...");
      return refreshPromise;
    }

    refreshPromise = (async () => {
      console.log("[AuthStore] Начало проверки сессии...");
      try {
        await api.post("/auth/refresh");
        const meResponse = await api.get<{ id: string; email: string }>(
          "/auth/me",
        );
        const { id, email } = meResponse.data;
        console.log(
          `[AuthStore] Сессия валидна, пользователь: ${email} (${id})`,
        );
        set({ isAuthenticated: true, isLoading: false, user: { id, email } });
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.log(
            "[AuthStore] Сессия не найдена или истекла:",
            err.message,
          );
        } else {
          console.log(
            "[AuthStore] Сессия не найдена или истекла: неизвестная ошибка",
          );
        }
        set({ isAuthenticated: false, isLoading: false, user: null });
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
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
      const message = extractErrorMessage(err, "Неверный email или пароль");
      console.error(`[AuthStore] Ошибка входа: ${message}`);
      throw createError(message, err);
    }
  },

  // Регистрация: отправляет данные на бэк, получает сообщение, НЕ устанавливает сессию
  register: async (email: string, password: string, displayName: string) => {
    console.log(`[AuthStore] Попытка регистрации: ${email}`);
    try {
      const res = await api.post("/auth/register", {
        email,
        password,
        displayName,
      });
      console.log(`[AuthStore] Регистрация успешна, письмо отправлено`);
      // Возвращаем сообщение для отображения экрана "Проверьте почту"
      return res.data.message as string;
    } catch (err: unknown) {
      const message = extractErrorMessage(err, "Ошибка регистрации");
      console.error(`[AuthStore] Ошибка регистрации: ${message}`);
      throw createError(message, err);
    }
  },

  // Подтверждение email по токену из письма → автоматический вход
  verifyEmail: async (token: string): Promise<void> => {
    console.log(`[AuthStore] Подтверждение email по токену`);
    try {
      // 1. Отправляем токен на бэкенд → бэк ставит emailVerified=true и устанавливает куки
      await api.post("/auth/verify-email", { token });
      console.log(`[AuthStore] Токен принят бэкендом, куки установлены`);

      // 2. Запрашиваем профиль для синхронизации Zustand-стора
      const meResponse = await api.get<{ id: string; email: string }>("/auth/me");
      const { id, email } = meResponse.data;
      
      console.log(`[AuthStore] Email подтверждён: ${email} (${id})`);
      // 3. Обновляем глобальное состояние авторизации
      set({ isAuthenticated: true, isLoading: false, user: { id, email } });
      // Промис успешно разрешается → .then() в компоненте срабатывает
    } catch (err: unknown) {
      const message = extractErrorMessage(err, "Токен недействителен или истёк");
      console.error(`[AuthStore] Ошибка verifyEmail: ${message}`);
      // Промис отклоняется → .catch() в компоненте срабатывает
      throw createError(message, err);
    }
  },

  // Повторная отправка письма верификации
  resendVerification: async (email: string) => {
    console.log(`[AuthStore] Запрос повторной верификации для: ${email}`);
    try {
      const res = await api.post("/auth/resend-verification", { email });
      console.log(`[AuthStore] Письмо отправлено повторно`);
      return res.data.message as string;
    } catch (err: unknown) {
      const message = extractErrorMessage(err, "Ошибка отправки");
      console.error(`[AuthStore] Ошибка resendVerification: ${message}`);
      throw createError(message, err);
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

  forgotPassword: async (email: string) => {
    console.log(`[AuthStore] Запрос сброса пароля для: ${email}`);
    try {
      await api.post("/auth/forgot-password", { email });
      console.log(`[AuthStore] Запрос сброса пароля отправлен`);
    } catch (err: unknown) {
      const message = extractErrorMessage(err, "Ошибка отправки");
      console.error(`[AuthStore] Ошибка forgotPassword: ${message}`);
      throw createError(message, err);
    }
  },

  resetPassword: async (token: string, password: string) => {
    console.log(`[AuthStore] Сброс пароля по токену`);
    try {
      await api.post("/auth/reset-password", { token, password });
      console.log(`[AuthStore] Пароль успешно сброшен`);
    } catch (err: unknown) {
      const message = extractErrorMessage(
        err,
        "Токен недействителен или истёк",
      );
      console.error(`[AuthStore] Ошибка resetPassword: ${message}`);
      throw createError(message, err);
    }
  },
}));
