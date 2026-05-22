// front\src\components\Portfolio\AssetSummary\AssetSummary.tsx

import type { AssetPosition } from "../../../types/portfolio.types";
import "./AssetSummary.css";

interface Props {
  data: AssetPosition;
}

export const AssetSummary = ({ data }: Props) => {
  // 🔹 Главный PnL: сумма реализованного и нереализованного
  const totalPnl = data.totalPnl ?? (data.pnl ?? 0) + (data.realizedPnl ?? 0);
  const totalPnlPercent = data.totalPnlPercent ?? 0;

  const isTotalProfit = totalPnl >= 0;
  const hasRealized = (data.realizedPnl ?? 0) !== 0;
  const hasUnrealized = (data.pnl ?? 0) !== 0 && data.amount > 0;
  const isClosed = data.amount === 0;

  // Форматирование с знаком
  const fmt = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;

  return (
    <div className="asset-summary">

      {/* ===== TOP: текущая стоимость и количество ===== */}
      <div className="as-top">
        {isClosed ? (
          // Позиция закрыта: не показываем $0 и 0 BTC
          <div className="as-closed-badge">
            ❌ Позиция закрыта
          </div>
        ) : (
          // Открытая позиция: показываем стоимость и количество
          <>
            <div className="as-value">${data.totalValue.toFixed(2)}</div>
            <div className="as-amount">{data.amount} {data.symbol}</div>
          </>
        )}
      </div>

      {/* ===== MIDDLE: ОБЩИЙ PnL (главный показатель) ===== */}
      <div className={`as-pnl ${isTotalProfit ? "up" : "down"}`}>
        <span className="as-pnl-value">
          {fmt(totalPnl)}$
        </span>
        <span className="as-pnl-percent">
           ({fmt(totalPnlPercent)}%)
        </span>
        <span className="as-pnl-label">
          {isClosed ? " реализовано" : " общий"}
        </span>
      </div>

      {/* ===== BOTTOM: детализация (только при частичных продажах) ===== */}
      {/* Показываем детализацию, если есть и реализованный, и нереализованный */}
      {hasRealized && hasUnrealized && (
        <div className="as-breakdown">
          <span className={`as-detail ${data.pnl! >= 0 ? "up" : "down"}`}>
           Нереал. {fmt(data.pnl!)}$
          </span>
          <span className={`as-detail ${data.realizedPnl! >= 0 ? "up" : "down"}`}>
            Реал. {fmt(data.realizedPnl!)}$
          </span>
        </div>
      )}

      {/* ===== FOOTER: вложения и средняя цена ===== */}
      <div className="as-invested">
        <span>
          • Вложено всего: ${(data.totalInvested ?? data.invested).toFixed(2)}
        </span>

        {/* Средняя цена покупки показывается ВСЕГДА, если есть данные (даже при закрытой позиции) */}
        {data.avgBuyPrice && data.avgBuyPrice > 0 && (
          <span className="as-avg">
            • Ср. цена покупки: ${data.avgBuyPrice.toFixed(2)}
          </span>
        )}
      </div>

    </div>
  );
};