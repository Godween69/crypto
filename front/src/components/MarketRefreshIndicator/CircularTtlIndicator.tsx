// front/src/components/MarketRefreshIndicator/CircularTtlIndicator.tsx
import { useEffect, useRef, useState } from 'react';
import './CircularTtlIndicator.css';

type Props = { nextUpdateAt: number; intervalMs?: number };

export const CircularTtlIndicator = ({ nextUpdateAt, intervalMs = 300_000 }: Props) => {

  const [intervalStart, setIntervalStart] = useState(() => nextUpdateAt - intervalMs);
  const [isPulsing, setIsPulsing] = useState(false);
  const prevUpdateAtRef = useRef(nextUpdateAt);

  // Детектируем смену nextUpdateAt синхронно (без зависимости от remainingMs)
  useEffect(() => {
    if (prevUpdateAtRef.current !== nextUpdateAt) {
      prevUpdateAtRef.current = nextUpdateAt;
      setIntervalStart(nextUpdateAt - intervalMs);

      setIsPulsing(true);
      const timeout = setTimeout(() => setIsPulsing(false), 800);
      return () => clearTimeout(timeout);
    }
  }, [nextUpdateAt, intervalMs]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Расчёт прогресса от intervalStart (стабильная база)
  const elapsed = now - intervalStart;
  const remainingMs = Math.max(0, nextUpdateAt - now);
  const progress = Math.min(1, Math.max(0, elapsed / intervalMs));
  const seconds = Math.ceil(remainingMs / 1000);

  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div className={`circular-ttl ${isPulsing ? 'pulse' : ''}`}>
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle className="track" cx="20" cy="20" r={radius} strokeWidth="3" fill="none" />
        <circle
          className="progress"
          cx="20" cy="20" r={radius} strokeWidth="3" fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 20 20)"
        />
      </svg>
      <span className="ttl-text">{seconds > 0 ? seconds : '—'}</span>
    </div>
  );
};
