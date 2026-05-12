import type { AssetPosition } from "../../../types/portfolio.types";
import "./AssetSummary.css";

interface Props {
  data: AssetPosition;
}

export const AssetSummary = ({ data }: Props) => {
  const isProfit = data.pnl >= 0;
  const hasAvgPrice = data.avgBuyPrice != null && data.avgBuyPrice > 0;

  return (
    <div className="asset-summary">

      {/* TOP: текущая стоимость и количество */}
      <div className="as-top">
        <div className="as-value">${data.totalValue.toFixed(2)}</div>
        <div className="as-amount">{data.amount} {data.symbol}</div>
      </div>

      {/* MIDDLE: PnL с цветом */}
      <div className={`as-pnl ${isProfit ? "up" : "down"}`}>
        {isProfit ? "+" : "-"}${Math.abs(data.pnl).toFixed(2)}{" "}
        ({data.pnlPercent.toFixed(2)}%) PnL
      </div>

      {/* BOTTOM: вложения + средняя цена покупки */}
      <div className="as-invested">
        <span>• Инвестировано всего: ${data.invested.toFixed(2)}</span>
        {hasAvgPrice && (
          <span className="as-avg">
            • Средняя цена покупки: ${data.avgBuyPrice!.toFixed(2)}
          </span>
        )}
      </div>

    </div>
  );
};