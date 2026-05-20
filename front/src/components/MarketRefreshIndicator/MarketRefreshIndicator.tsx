// front/src/components/MarketRefreshIndicator/MarketRefreshIndicator.tsx

import { useEffect, useState } from 'react';

type Props = { nextUpdateAt: number; intervalMs?: number };

export const MarketRefreshIndicator = ({ nextUpdateAt, intervalMs = 300_000 }: Props) => {
  // ленивая инициализация: вычисляется один раз при маунте, соблюдая чистоту рендера
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, nextUpdateAt - Date.now()));

  useEffect(() => {
    const tick = () => {
      setRemainingMs(Math.max(0, nextUpdateAt - Date.now())); // обновляем остаток каждую секунду
    };
    tick(); // мгновенный расчёт при маунте или смене серверной метки
    const timer = setInterval(tick, 1000); // таймер для плавного обновления UI
    return () => clearInterval(timer); // очистка интервала при анмаунте или смене зависимостей
  }, [nextUpdateAt, intervalMs]);

  // чистые вычисления на основе состояния (без Date.now() в фазе рендера)
  const progress = 1 - remainingMs / intervalMs;
  const secondsLeft = Math.ceil(remainingMs / 1000);

  return (
    <div className="ttl-bar-track">
      <div className="ttl-bar-fill" style={{ width: `${progress * 100}%` }} />
      <span className="ttl-bar-label">{secondsLeft}с</span>
    </div>
  );
};