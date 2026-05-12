import { useMemo } from "react";
import type { PortfolioItemView } from "../../../types/portfolio.types";
import './PortfolioSummary.css';

// Форматирование числа
const fmt = (n: number) => n.toFixed(2);

// Класс и иконка в зависимости от знака
const getChangeClass = (v: number) => v > 0 ? 'up' : v < 0 ? 'down' : 'neutral';
const getChangeIcon = (v: number) => v > 0 ? '▲' : v < 0 ? '▼' : '●';

interface Props {
  items: PortfolioItemView[];
}

export const PortfolioSummary = ({ items }: Props) => {

  // Мемоизация расчётов
  const stats = useMemo(() => {
    const invested = items.reduce((s, i) => s + (i.invested ?? 0), 0);
    const value = items.reduce((s, i) => s + (i.totalValue ?? 0), 0);
    const pnl = items.reduce((s, i) => s + (i.pnl ?? (i.totalValue ?? 0) - (i.invested ?? 0)), 0);
    const change24h = items.reduce((s, i) => s + (i.change24hValue ?? 0), 0);

    const base24h = value - change24h;
    const change24hPercent = base24h ? (change24h / base24h) * 100 : 0;
    const pnlPercent = invested ? (pnl / invested) * 100 : 0;

    return { invested, value, pnl, pnlPercent, change24h, change24hPercent };
  }, [items]);

  if (!items.length) {
    return (
      <div className="portfolio-summary portfolio-summary--empty">
        <span>Портфель пуст</span>
      </div>
    );
  }

  // Вычисляем классы один раз для чистоты JSX
  const class24h = getChangeClass(stats.change24h);
  const classPnl = getChangeClass(stats.pnl);

  return (
    <div className="portfolio-summary" role="region" aria-label="Сводка портфеля">

      {/* Вложено (всегда белый) */}
      <div className="ps-row ps-main" aria-label={`Вложено: ${fmt(stats.invested)} долларов`}>
        ${fmt(stats.invested)}
      </div>

      {/* Изменение за 24ч: цвет применяется к стрелке, сумме и процентам */}
      <div className="ps-row">
        <span className={`ps-arrow ${class24h}`} aria-hidden="true">
          {getChangeIcon(stats.change24h)}
        </span>
        <span className={`ps-value ${class24h}`}>
          {fmt(stats.change24h)}$
        </span>
        <span className={`ps-meta ${class24h}`}>
          ({fmt(stats.change24hPercent)}%) за сутки
        </span>
        <span className="sr-only">
          Изменение за 24 часа: {stats.change24h > 0 ? 'рост' : stats.change24h < 0 ? 'падение' : 'без изменений'} на {fmt(stats.change24hPercent)} процентов
        </span>
      </div>

      {/* Общий PnL: цвет применяется к стрелке, сумме и процентам */}
      <div className="ps-row">
        <span className={`ps-arrow ${classPnl}`} aria-hidden="true">
          {getChangeIcon(stats.pnl)}
        </span>
        <span className={`ps-value ${classPnl}`}>
          {fmt(stats.pnl)}$
        </span>
        <span className={`ps-meta ${classPnl}`}>
          ({fmt(stats.pnlPercent)}%) общий
        </span>
        <span className="sr-only">
          Прибыль/убыток: {stats.pnl > 0 ? 'прибыль' : stats.pnl < 0 ? 'убыток' : 'нулевой результат'} {fmt(stats.pnlPercent)} процентов
        </span>
      </div>

    </div>
  );
};