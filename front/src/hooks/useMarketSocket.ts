// front/src/hooks/useMarketSocket.ts

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";

export const useMarketSocket = () => {
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id);

  const queryClient = useQueryClient();
  const [nextUpdateAt, setNextUpdateAt] = useState(() => Date.now() + 300_000);
  const socketRef = useRef<Socket | null>(null);
  const connectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

  useEffect(() => {
    // Если пользователь не авторизован или ещё идёт проверка — отключаем
    if (isLoading || !isAuthenticated || !userId) {
      if (connectTimerRef.current) {
        clearTimeout(connectTimerRef.current);
        connectTimerRef.current = null;
      }
      if (socketRef.current) {
        console.log("[WS] Отключение: сессия невалидна");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Если уже подключены или подключение запланировано — ничего не делаем
    // Читаем ref через локальную переменную внутри effect — это разрешено
    if (socketRef.current?.connected || connectTimerRef.current) {
      return;
    }

    // ДЕБАУНС 500мс: даём браузеру время обработать Set-Cookie из /auth/refresh
    connectTimerRef.current = setTimeout(() => {
      connectTimerRef.current = null;

      // Дополнительная проверка: действительно ли мы всё ещё авторизованы
      const currentState = useAuthStore.getState();
      if (!currentState.isAuthenticated || !currentState.user?.id) {
        console.log(
          "[WS] Подключение отменено: пользователь разлогинился во время debounce",
        );
        return;
      }

      console.log(
        `[WS] Подключение к market namespace для userId=${currentState.user.id}`,
      );

      socketRef.current = io(`${baseUrl}/market`, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        timeout: 10000,
        withCredentials: true,
      });

      const socket = socketRef.current;

      socket.on("connect", () => {
        console.log(`[WS] ✅ Подключён (socketId=${socket.id})`);
      });

      socket.on("disconnect", (reason) => {
        console.log(`[WS] 🔌 Отключён: ${reason}`);
      });

      // Используем debug-уровень, чтобы не спамить консоль
      socket.on("connect_error", (err) => {
        console.debug("[WS] Ошибка подключения:", err.message);
      });

      socket.on("market:ttl_sync", (p: { nextUpdateAt: number }) => {
        setNextUpdateAt(p.nextUpdateAt);
      });

      socket.on("market:sync", (p: { nextUpdateAt?: number }) => {
        if (p.nextUpdateAt) setNextUpdateAt(p.nextUpdateAt);
        queryClient.invalidateQueries({ queryKey: ["market"] });
        queryClient.invalidateQueries({ queryKey: ["portfolio"] });
        queryClient.invalidateQueries({ queryKey: ["portfolio-index"] });
      });

      socket.on("portfolio:rebuilt", () => {
        console.log("[WS] 📊 portfolio:rebuilt");
        queryClient.invalidateQueries({ queryKey: ["portfolio"] });
        queryClient.invalidateQueries({ queryKey: ["portfolio-index"] });
      });

      socket.on("exception", (error: { message?: string }) => {
        console.error("[WS] Server exception:", error);
        if (error.message?.includes("Unauthorized")) {
          useAuthStore.getState().logout();
        }
      });
    }, 500); // 500мс debounce

    return () => {
      // Cleanup: отменяем таймер и отключаем сокет
      if (connectTimerRef.current) {
        clearTimeout(connectTimerRef.current);
        connectTimerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.off("connect");
        socketRef.current.off("disconnect");
        socketRef.current.off("connect_error");
        socketRef.current.off("market:ttl_sync");
        socketRef.current.off("market:sync");
        socketRef.current.off("portfolio:rebuilt");
        socketRef.current.off("exception");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isLoading, isAuthenticated, userId, queryClient, baseUrl]);

  // Фоллбэк-таймер, если WS не подключён
  useEffect(() => {
    const socket = socketRef.current;
    // Читаем ref внутри effect — это разрешено
    if (socket?.connected) return;

    const timeUntilExpiry = nextUpdateAt - Date.now();
    if (timeUntilExpiry <= 1000) return;

    const timer = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["market"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-index"] });
    }, timeUntilExpiry);

    return () => clearTimeout(timer);
  }, [nextUpdateAt, queryClient]);

  // НЕ читаем ref.current в return — возвращаем только state
  return { nextUpdateAt };
};
