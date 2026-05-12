import type { PortfolioItemView } from "../../../types/portfolio.types";
import { Trash2 } from "lucide-react";
import { useDeletePortfolioItem } from "../../../hooks/useDeletePortfolioItem";
import "./PortfolioCard.css";

interface Props {
  item: PortfolioItemView;
  onOpen: (symbol: string) => void;
}

// ✅ Вынесено вне компонента — не пересоздаётся при каждом рендере
const formatPrice = (value: number | null | undefined): string =>
  (value ?? 0).toFixed(2);

const getChangeClass = (change: number): string => {
  if (change > 0) return 'up';
  if (change < 0) return 'down';
  return 'neutral';
};

const getChangeIcon = (change: number): string =>
  change > 0 ? '▲' : change < 0 ? '▼' : '●';

export const PortfolioCard = ({ item, onOpen }: Props) => {
  const { mutate: deleteItem } = useDeletePortfolioItem();
  const change = item.change24h ?? 0;

  const handleDelete = (
    e: React.MouseEvent<HTMLButtonElement>,
    symbol: string
  ) => {
    e.stopPropagation();
    if (!confirm("Полностью удалить актив из портфеля?")) return;
    deleteItem(symbol);
  };

  return (
    <div className="portfolio-card" onClick={() => onOpen(item.symbol)}>
      
      {/* ЛЕВЫЙ БЛОК */}
      <div className="pc-left">
        <div className="pc-icon">👉</div>
        <div className="pc-symbol">{item.symbol}</div>
      </div>

      {/* ЦЕНТРАЛЬНЫЙ БЛОК */}
      <div className="pc-center">
        <div className="pc-price">${formatPrice(item.currentPrice)}</div>
        <div className={`pc-change ${getChangeClass(change)}`}>
          {getChangeIcon(change)} {change.toFixed(2)}%
        </div>
      </div>

      {/* ПРАВЫЙ БЛОК: данные + кнопка удаления */}
      <div className="trash-block">
        <div className="pc-right">
          <div className="pc-invested">${formatPrice(item.totalValue)}</div>
          <div className="pc-amount">{item.amount} {item.symbol}</div>
        </div>
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