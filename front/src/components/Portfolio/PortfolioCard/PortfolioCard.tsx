// front/src/components/Portfolio/PortfolioCard/PortfolioCard.tsx

import type { PortfolioItem } from "../../../types/portfolio.types";
import { Trash2 } from "lucide-react";
import { useDeletePortfolioItem } from "../../../hooks/useDeletePortfolioItem";
import { formatCoinName } from "../../../utils/formatCoinName";

import "./PortfolioCard.css";

interface Props {
  item: PortfolioItem;
  onOpen: (symbol: string) => void;
}

// формат цены // защита от undefined/null
const formatPrice = (value: number | null | undefined): string =>
  (value ?? 0).toFixed(2);

// класс изменения цены // up/down/neutral
const getChangeClass = (change: number): string => {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "neutral";
};

// иконка изменения цены // визуальная стрелка
const getChangeIcon = (change: number): string =>
  change > 0 ? "▲" : change < 0 ? "▼" : "●";

export const PortfolioCard = ({ item, onOpen }: Props) => {
  const { mutate: deleteItem } = useDeletePortfolioItem();

  // защита от undefined
  const change = item.change24h ?? 0;

  // нормализация image (CoinGecko иногда отдаёт null/undefined)
  const imageSrc = item.image || "/fallback-coin.png";

  const displayName = formatCoinName(item.name, item.coinId, item.symbol);

  // delete handler // stopPropagation чтобы не открыть карточку
  const handleDelete = (
    e: React.MouseEvent<HTMLButtonElement>,
    symbol: string
  ) => {
    e.stopPropagation();

    if (!confirm("Полностью удалить актив из портфеля?")) return;

    deleteItem(symbol);
  };

  return (
    <div
      className="portfolio-card"
      onClick={() => onOpen(item.symbol)}
    >

      {/* ===== LEFT BLOCK ===== */}
      <div className="pc-left">

        {/* RANK (фиксированная колонка слева) */}
        <div className="pc-rank-box">
          <span className="pc-rank">
            #{item.rank ?? "—"}
          </span>
        </div>

        {/* ICON (фиксированная) */}
        <img
          className="pc-icon"
          src={imageSrc}
          alt={item.symbol}
        />

        {/* TEXT BLOCK */}
        <div className="pc-symbol-block">

          <div className="pc-symbol">
            {item.symbol}
          </div>

          <div className="pc-meta">
            <span className="pc-name">
              {displayName}
            </span>
          </div>

        </div>
      </div>

      {/* ===== CENTER BLOCK ===== */}
      <div className="pc-center">

        {/* PRICE */}
        <div className="pc-price">
          ${formatPrice(item.currentPrice)}
        </div>

        {/* 24h CHANGE */}
        <div className={`pc-change ${getChangeClass(change)}`}>
          {getChangeIcon(change)} {change.toFixed(2)}%
        </div>

      </div>

      {/* ===== RIGHT BLOCK ===== */}
      <div className="trash-block">

        <div className="pc-right">

          {/* TOTAL VALUE */}
          <div className="pc-invested">
            ${formatPrice(item.totalValue)}
          </div>

          {/* AMOUNT */}
          <div className="pc-amount">
            {item.amount} {item.symbol}
          </div>

        </div>

        {/* DELETE BUTTON */}
        <button
          className="btn-delete-icon"
          onClick={(e) => handleDelete(e, item.symbol)}
          aria-label={`Удалить ${item.symbol}`}
        >
          <Trash2 size={18} />
        </button>

      </div>

    </div>
  );
};