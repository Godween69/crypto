import { useEffect, useState } from 'react';
import './MarketRefreshIndicator.css';

// Компонент больше не принимает пропсы! Он автономный.
// Просто тикает 5 минут и сбрасывается.
export const MarketRefreshIndicator = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 300; // 5 минут = 300 секунд
    const step = 100 / duration; // ~0.33% в секунду

    // Интервал обновляет прогресс каждую секунду
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        return next >= 100 ? 100 : next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []); //  Пустой массив зависимостей = запускается 1 раз при монтировании

  return (
    <div className="market-refresh-bar" title="Цены обновятся через 5 минут">
      <div className="market-refresh-bar__fill" style={{ width: `${progress}%` }} />
    </div>
  );
};