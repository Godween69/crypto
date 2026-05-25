// front/src/hooks/useMarketSocket.ts
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";

export const useMarketSocket = () => {
  const queryClient = useQueryClient();
  const [nextUpdateAt, setNextUpdateAt] = useState(() => Date.now() + 300_000);
  const socketRef = useRef<Socket | null>(null);
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

    socket.on("market:ttl_sync", (p) => setNextUpdateAt(p.nextUpdateAt));

    socket.on("market:sync", (p) => {
      if (p.nextUpdateAt) setNextUpdateAt(p.nextUpdateAt);
      // точечная инвалидация конкретных ключей вместо exact:false
      // Это предотвращает перезапрос всех вложенных queryKey (детальных страниц)
      queryClient.invalidateQueries({ queryKey: ["market"], exact: true });
      queryClient.invalidateQueries({ queryKey: ["market-data"], exact: true });
      queryClient.invalidateQueries({ queryKey: ["portfolio"], exact: true });
      queryClient.invalidateQueries({
        queryKey: ["portfolio-index"],
        exact: true,
      });
    });

    if (!socket.connected) socket.connect();

    return () => {
      socket.off("market:ttl_sync");
      socket.off("market:sync");
      socket.disconnect();
    };
  }, [queryClient, baseUrl]);

  // фоллбэк-таймер ТОЛЬКО если сокет неактивен (защита от "преждевременных" запросов)
  useEffect(() => {
    const socket = socketRef.current;
    // Если сокет жив и подключён — доверяем ему, не ставим таймер
    if (socket?.connected) return;

    const timeUntilExpiry = nextUpdateAt - Date.now();
    if (timeUntilExpiry <= 1000) return; // слишком поздно, не ставим таймер

    const timer = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["market"], exact: true });
      queryClient.invalidateQueries({ queryKey: ["portfolio"], exact: true });
    }, timeUntilExpiry); // ждём ровно до nextUpdateAt

    return () => clearTimeout(timer);
  }, [nextUpdateAt, queryClient]);

  return { nextUpdateAt };
};
