// front/src/hooks/useMarketSocket.ts
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
        // создаём сокет единожды за жизненный цикл
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
      });
    }
    const socket = socketRef.current;

    socket.on("market:ttl_sync", (p) => setNextUpdateAt(p.nextUpdateAt)); // синхронизируем метку при коннекте
    socket.on("market:sync", (p) => {
      if (p.nextUpdateAt) setNextUpdateAt(p.nextUpdateAt); // обновляем TTL-индикатор при пуше
      queryClient.invalidateQueries({ queryKey: ["market"], exact: false }); // валидируем кэш через бэкенд
    });

    if (!socket.connected) socket.connect(); // восстанавливаем канал после Strict Mode анмаунта

    return () => {
      socket.off("market:ttl_sync"); // отписываемся от событий текущего рендера
      socket.off("market:sync"); // предотвращаем накопление обработчиков
      socket.disconnect(); // разрываем соединение при реальном анмаунте
    };
  }, [queryClient, baseUrl]);

  // Гарантированная инвалидация при истечении TTL
  useEffect(() => {
    const timeUntilExpiry = nextUpdateAt - Date.now();
    if (timeUntilExpiry <= 500) return; // цикл завершён, таймер не нужен
    const timer = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["market"], exact: false }); // помечаем кэш устаревшим за 0.5с до конца
    }, timeUntilExpiry - 500);
    return () => clearTimeout(timer); // сброс при обновлении метки или уходе со страницы
  }, [nextUpdateAt, queryClient]);

  return { nextUpdateAt };
};
