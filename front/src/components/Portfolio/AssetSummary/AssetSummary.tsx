// front/src/components/Portfolio/AssetSummary/AssetSummary.tsx

import type { PortfolioItem } from "../../../types/portfolio.types";
import "./AssetSummary.css";

interface Props {
  data: PortfolioItem;
}

export const AssetSummary = ({ data }: Props) => {
  const totalPnl = data.totalPnl ?? (data.pnl ?? 0) + (data.realizedPnl ?? 0);
  const totalPnlPercent = data.totalPnlPercent ?? 0;

  const isTotalProfit = totalPnl >= 0;
  const hasRealized = (data.realizedPnl ?? 0) !== 0;
  const hasUnrealized = (data.pnl ?? 0) !== 0 && (data.amount ?? 0) > 0;
  const isClosed = (data.amount ?? 0) === 0;

  const fmt = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;

  return (
    <div className="asset-summary">
      <div className="as-top">
        {isClosed ? (
          <div className="as-closed-badge">❌ Позиция закрыта</div>
        ) : (
          <>
            <div className="as-value">${(data.totalValue ?? 0).toFixed(2)}</div>
            <div className="as-amount">{data.amount ?? 0} {data.symbol}</div>
          </>
        )}
      </div>

      <div className={`as-pnl ${isTotalProfit ? "up" : "down"}`}>
        <span className="as-pnl-value">{fmt(totalPnl)}$</span>
        <span className="as-pnl-percent">({fmt(totalPnlPercent)}%)</span>
        <span className="as-pnl-label">{isClosed ? " реализовано" : " общий"}</span>
      </div>

      {hasRealized && hasUnrealized && (
        <div className="as-breakdown">
          <span className={`as-detail ${(data.pnl ?? 0) >= 0 ? "up" : "down"}`}>
            Нереал. {fmt(data.pnl ?? 0)}$
          </span>
          <span className={`as-detail ${(data.realizedPnl ?? 0) >= 0 ? "up" : "down"}`}>
            Реал. {fmt(data.realizedPnl ?? 0)}$
          </span>
        </div>
      )}

      <div className="as-invested">
        <span>
          • Вложено всего: ${(data.totalInvested ?? data.invested ?? 0).toFixed(2)}
        </span>
        {/* 🔥 FIX: используем avgPrice вместо avgBuyPrice */}
        {(data.avgPrice ?? 0) > 0 && (
          <span className="as-avg">
            • Ср. цена покупки: ${(data.avgPrice ?? 0).toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
};