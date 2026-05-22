// front/src/components/Portfolio/PortfolioSummary/PortfolioSummary.tsx
import { useMemo } from "react";
import type { PortfolioItemView } from "../../../types/portfolio.types";
import './PortfolioSummary.css';

const fmt = (n: number) => n.toFixed(2);
const getChangeClass = (v: number) => v > 0 ? 'up' : v < 0 ? 'down' : 'neutral';
const getChangeIcon = (v: number) => v > 0 ? '▲' : v < 0 ? '▼' : '●';

interface Props {
  items: PortfolioItemView[];
}

export const PortfolioSummary = ({ items }: Props) => {
  const stats = useMemo(() => {
    let currentValue = 0;
    let currentInvested = 0;
    let totalHistoricalInvested = 0;
    let totalRealizedPnl = 0;
    let totalUnrealizedPnl = 0;
    let change24h = 0;

    // агрегируем показатели по всем активам
    for (const i of items) {
      currentValue += i.totalValue ?? 0;
      currentInvested += i.invested ?? 0;
      totalHistoricalInvested += i.totalInvested ?? 0;
      totalRealizedPnl += i.realizedPnl ?? 0;
      totalUnrealizedPnl += i.pnl ?? 0;
      change24h += i.change24hValue ?? 0;
    }

    const totalPnl = totalUnrealizedPnl + totalRealizedPnl; // учитываем закрытые позиции
    const base24h = currentValue - change24h;
    const change24hPercent = base24h !== 0 ? (change24h / base24h) * 100 : 0;
    const pnlPercent = totalHistoricalInvested !== 0 ? (totalPnl / totalHistoricalInvested) * 100 : 0;

    return { currentValue, currentInvested, totalPnl, pnlPercent, change24h, change24hPercent };
  }, [items]);

  if (!items.length) {
    return <div className="portfolio-summary portfolio-summary--empty"><span>Портфель пуст</span></div>;
  }

  const class24h = getChangeClass(stats.change24h);
  const classPnl = getChangeClass(stats.totalPnl);

  return (
    <div className="portfolio-summary" role="region" aria-label="Сводка портфеля">
      {/* Текущая рыночная стоимость портфеля */}
      <div className="ps-row ps-main" aria-label={`Стоимость: ${fmt(stats.currentValue)} долларов`}>
        ${fmt(stats.currentValue)}
      </div>

      {/* Изменение за 24ч */}
      <div className="ps-row">
        <span className={`ps-arrow ${class24h}`} aria-hidden="true">{getChangeIcon(stats.change24h)}</span>
        <span className={`ps-value ${class24h}`}>{fmt(stats.change24h)}$</span>
        <span className={`ps-meta ${class24h}`}>({fmt(stats.change24hPercent)}%) за сутки</span>
        <span className="sr-only">
          Изменение за 24 часа: {stats.change24h > 0 ? 'рост' : stats.change24h < 0 ? 'падение' : 'без изменений'} на {fmt(stats.change24hPercent)} процентов
        </span>
      </div>

      {/* Общий PnL: включает реализованную прибыль от закрытых позиций */}
      <div className="ps-row">
        <span className={`ps-arrow ${classPnl}`} aria-hidden="true">{getChangeIcon(stats.totalPnl)}</span>
        <span className={`ps-value ${classPnl}`}>{fmt(stats.totalPnl)}$</span>
        <span className={`ps-meta ${classPnl}`}>({fmt(stats.pnlPercent)}%) общий</span>
        <span className="sr-only">
          Прибыль/убыток: {stats.totalPnl > 0 ? 'прибыль' : stats.totalPnl < 0 ? 'убыток' : 'нулевой результат'} {fmt(stats.pnlPercent)} процентов
        </span>
      </div>
    </div>
  );
};