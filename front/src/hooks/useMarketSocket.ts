// front/src/hooks/useMarketSocket.ts

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";

export const useMarketSocket = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const [nextUpdateAt, setNextUpdateAt] = useState(() => Date.now() + 300_000);
  const socketRef = useRef<Socket | null>(null);
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

  useEffect(() => {
    // Не подключаемся, если пользователь не авторизован
    if (!isAuthenticated) {
      if (socketRef.current) {
        console.log("[WS] Отключение: пользователь не авторизован");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (!socketRef.current) {
      console.log("[WS] Подключение к market namespace");
      socketRef.current = io(`${baseUrl}/market`, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        withCredentials: true,
      });
    }

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("[WS] Подключён к market namespace");
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
      console.log("[WS] Получено событие portfolio:rebuilt");
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-index"] });
    });

    socket.on("exception", (error: { message?: string }) => {
      console.error("[WS] Ошибка:", error);
      if (error.message?.includes("Unauthorized")) {
        useAuthStore.getState().logout();
      }
    });

    if (!socket.connected) socket.connect();

    return () => {
      socket.off("market:ttl_sync");
      socket.off("market:sync");
      socket.off("portfolio:rebuilt");
      socket.off("exception");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, queryClient, baseUrl]);

  // Фоллбэк-таймер ТОЛЬКО если сокет неактивен
  useEffect(() => {
    const socket = socketRef.current;
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

  return { nextUpdateAt };
};
