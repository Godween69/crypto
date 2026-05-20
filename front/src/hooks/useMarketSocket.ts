// front/src/hooks/useMarketSocket.ts
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import type { MarketData } from "../types/portfolio.types";

export const useMarketSocket = () => {
  const queryClient = useQueryClient();
  const [nextUpdateAt, setNextUpdateAt] = useState(() => Date.now() + 300_000);
  const socketRef = useRef<Socket | null>(null); // сохраняем инстанс между двойными рендерами Strict Mode
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
      if (p.type === "cache_updated") {
        setNextUpdateAt(p.nextUpdateAt); // сбрасываем прогресс-бар на новую метку
        queryClient.setQueryData(["market"], p.data as MarketData[]); // обновляем кэш без лишнего GET
      }
    });

    if (!socket.connected) socket.connect(); // восстанавливаем канал после Strict Mode анмаунта

    return () => {
      socket.off("market:ttl_sync"); // отписываемся от событий текущего рендера
      socket.off("market:sync"); // предотвращаем накопление обработчиков
      socket.disconnect(); // разрываем соединение (в dev вызывает предупреждение, в prod работает чисто)
    };
  }, [queryClient, baseUrl]);

  return { nextUpdateAt };
};
