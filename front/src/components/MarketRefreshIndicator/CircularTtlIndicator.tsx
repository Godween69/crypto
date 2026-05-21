// front/src/components/MarketRefreshIndicator/CircularTtlIndicator.tsx
import { useEffect, useRef, useState } from 'react';
import './CircularTtlIndicator.css';

type Props = { nextUpdateAt: number; intervalMs?: number };

export const CircularTtlIndicator = ({ nextUpdateAt, intervalMs = 300_000 }: Props) => {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, nextUpdateAt - Date.now()));
  const [isPulsing, setIsPulsing] = useState(false); // флаг визуального сигнала обновления
  const prevUpdateAtRef = useRef(nextUpdateAt); // отслеживаем реальные сбросы таймера

  useEffect(() => {
    const tick = () => setRemainingMs(Math.max(0, nextUpdateAt - Date.now()));
    tick(); // мгновенный расчёт при маунте или смене метки
    const timer = setInterval(tick, 1000); // обновление остатка каждую секунду
    return () => clearInterval(timer); // очистка интервала при анмаунте
  }, [nextUpdateAt]);

  useEffect(() => {
    // детектируем приход нового market:sync (метка изменилась + таймер сбросился к началу)
    if (prevUpdateAtRef.current !== nextUpdateAt && remainingMs > intervalMs * 0.8) {
      setIsPulsing(true); // запускаем визуальную пульсацию
      const timeout = setTimeout(() => setIsPulsing(false), 800);
      prevUpdateAtRef.current = nextUpdateAt; // запоминаем актуальную метку
      return () => clearTimeout(timeout);
    }
  }, [nextUpdateAt, remainingMs, intervalMs]);

  const progress = 1 - remainingMs / intervalMs; // доля заполненности от 0 до 1
  const seconds = Math.ceil(remainingMs / 1000); // остаток в секундах для текста
  const radius = 16; // радиус SVG-окружности
  const circumference = 2 * Math.PI * radius; // длина окружности для stroke-dasharray
  const offset = circumference * (1 - progress); // смещение штриха для визуального прогресса

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
          transform="rotate(-90 20 20)" // поворот для старта сверху
        />
      </svg>
      <span className="ttl-text">{seconds}</span>
    </div>
  );
};