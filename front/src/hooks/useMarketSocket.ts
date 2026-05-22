import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";

export const useMarketSocket = () => {
  const queryClient = useQueryClient();
  const [nextUpdateAt, setNextUpdateAt] = useState(() => Date.now() + 300_000);
  const socketRef = useRef<Socket | null>(null); // сохраняем инстанс между циклами Strict Mode
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(`${baseUrl}/market`, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
      });
    }
    const socket = socketRef.current;

    // синхронизируем метку TTL при подключении
    socket.on("market:ttl_sync", (p) => setNextUpdateAt(p.nextUpdateAt));

    // при пуше цен инвалидируем и рынок, и портфель для мгновенного пересчёта сводки
    socket.on("market:sync", (p) => {
      if (p.nextUpdateAt) setNextUpdateAt(p.nextUpdateAt);
      queryClient.invalidateQueries({ queryKey: ["market"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["portfolio"], exact: false }); // гарантирует обновление виджета
    });

    if (!socket.connected) socket.connect(); // восстанавливаем канал после Strict Mode анмаунта

    return () => {
      socket.off("market:ttl_sync");
      socket.off("market:sync");
      socket.disconnect(); // разрываем соединение при реальном анмаунте
    };
  }, [queryClient, baseUrl]);

  // гарантированная инвалидация при истечении TTL (фоллбэк при разрыве WS)
  useEffect(() => {
    const timeUntilExpiry = nextUpdateAt - Date.now();
    if (timeUntilExpiry <= 500) return; // цикл завершён, таймер не нужен
    const timer = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["market"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["portfolio"], exact: false }); // синхронный фоллбэк
    }, timeUntilExpiry - 500);
    return () => clearTimeout(timer);
  }, [nextUpdateAt, queryClient]);

  return { nextUpdateAt };
};
