// front/src/components/Portfolio/PortfolioSummary/PortfolioSummary.tsx

import { useMemo } from "react";
import type { PortfolioItem } from "../../../types/portfolio.types";
import "./PortfolioSummary.css";

const fmt = (n: number) => n.toFixed(2);
const fmtSign = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;

interface Props {
  items: PortfolioItem[];
}

export const PortfolioSummary = ({ items }: Props) => {
  const stats = useMemo(() => {
    let currentValue = 0;
    let totalRealizedPnl = 0;
    let totalUnrealizedPnl = 0;
    let totalNetInvested = 0;
    let totalValueYesterday = 0;

    for (const i of items) {
      const currentVal = i.totalValue ?? 0;
      currentValue += currentVal;

      totalRealizedPnl += i.realizedPnl ?? 0;
      totalUnrealizedPnl += i.pnl ?? 0;
      totalNetInvested += i.netInvested ?? 0;

      const change24hPercent = i.change24h ?? 0;
      if (currentVal > 0 && !isNaN(change24hPercent)) {
        const prevVal = currentVal / (1 + change24hPercent / 100);
        totalValueYesterday += prevVal;
      } else {
        totalValueYesterday += currentVal;
      }
    }

    const totalPnl = totalRealizedPnl + totalUnrealizedPnl;
    const totalPnlPercent = totalNetInvested > 0 ? (totalPnl / totalNetInvested) * 100 : 0;

    const change24hValue = currentValue - totalValueYesterday;
    const change24hPercentTotal = totalValueYesterday > 0
      ? (change24hValue / totalValueYesterday) * 100
      : 0;

    return {
      currentValue,
      totalPnl,
      totalPnlPercent,
      totalUnrealizedPnl,
      totalRealizedPnl,
      change24hValue,
      change24hPercent: change24hPercentTotal,
      hasRealizedPnl: Math.abs(totalRealizedPnl) > 0.01,
    };
  }, [items]);

  if (!items.length) {
    return <div className="portfolio-summary portfolio-summary--empty"><span>Портфель пуст</span></div>;
  }

  const getPnlClass = (val: number) => (val > 0 ? "up" : val < 0 ? "down" : "neutral");
  const getArrow = (val: number) => (val > 0 ? "▲" : val < 0 ? "▼" : "●");

  const class24h = getPnlClass(stats.change24hValue);
  const classTotalPnl = getPnlClass(stats.totalPnl);
  const classUnrealized = getPnlClass(stats.totalUnrealizedPnl);
  const classRealized = getPnlClass(stats.totalRealizedPnl);

  return (
    <div className="portfolio-summary" role="region" aria-label="Сводка портфеля">
      <div className="ps-row ps-main">
        <span className="ps-label">Текущая стоимость</span>
        <span className="ps-value-large">${fmt(stats.currentValue)}</span>
      </div>

      <div className="ps-row ps-secondary">
        <span className="ps-label">За 24ч</span>
        <div className={`ps-pill ${class24h}`}>
          <span className="ps-icon">{getArrow(stats.change24hValue)}</span>
          <span>{fmtSign(stats.change24hValue)}$ ({fmt(stats.change24hPercent)}%)</span>
        </div>
      </div>

      <div className="ps-divider"></div>

      <div className="ps-row ps-highlight">
        <span className="ps-label">Общий результат (PnL)</span>
        <div className={`ps-total-pnl ${classTotalPnl}`}>
          <span className="ps-icon">{getArrow(stats.totalPnl)}</span>
          <span className="ps-value-bold">{fmtSign(stats.totalPnl)}$</span>
          <span className="ps-percent">({fmt(stats.totalPnlPercent)}%)</span>
        </div>
      </div>

      <div className="ps-breakdown">
        <div className="ps-detail-row">
          <span className="ps-detail-label">Нереализованный</span>
          <span className={`ps-detail-value ${classUnrealized}`}>
            {fmtSign(stats.totalUnrealizedPnl)}$
          </span>
        </div>

        {stats.hasRealizedPnl && (
          <div className="ps-detail-row">
            <span className="ps-detail-label">Реализованный</span>
            <span className={`ps-detail-value ${classRealized}`}>
              {fmtSign(stats.totalRealizedPnl)}$
            </span>
          </div>
        )}
      </div>
    </div>
  );
};