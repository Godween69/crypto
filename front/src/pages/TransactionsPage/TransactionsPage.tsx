// front/src/pages/TransactionsPage/TransactionsPage.tsx

import { useParams } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { AssetSummary } from "../../components/Portfolio/AssetSummary/AssetSummary";
import { useTransactions } from "../../hooks/useTransactions";
import { usePortfolio } from "../../hooks/usePortfolio";
import { useDeleteTransaction } from "../../hooks/useDeleteTransaction";
import { formatCoinName } from "../../utils/formatCoinName";
import "./TransactionsPage.css";

export const TransactionPage = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const { mutate: deleteTx } = useDeleteTransaction();

  const txQuery = useTransactions(symbol ?? "");
  const portfolioQuery = usePortfolio();

  const transactions = txQuery.data ?? [];
  // 🔥 Берём готовую рассчитанную позицию с бэкенда
  const position = portfolioQuery.data?.find(
    (p) => p.symbol === symbol?.toUpperCase()
  );

  const assetName = formatCoinName(position?.name, position?.coinId, symbol);

  if (!symbol) return <div className="tp-state">Неверный символ</div>;
  if (txQuery.isPending || portfolioQuery.isLoading)
    return <div className="tp-state tp-state--loading">Загрузка...</div>;
  if (txQuery.error || portfolioQuery.error)
    return (
      <div className="tp-state tp-state--error">
        <p>Ошибка загрузки данных</p>
        <button onClick={() => { txQuery.refetch(); portfolioQuery.refetch(); }}>
          Повторить
        </button>
      </div>
    );

  const handleDelete = (id: string) => {
    if (!confirm("Удалить транзакцию?")) return;
    deleteTx(id);
  };

  // 🔥 Фоллбэк для закрытых позиций или если актив выведен из портфеля
  const safePosition = position ?? {
    symbol: symbol.toUpperCase(),
    amount: 0,
    currentPrice: 0,
    totalValue: 0,
    invested: 0,
    totalInvested: 0,
    netInvested: 0,
    pnl: 0,
    pnlPercent: 0,
    realizedPnl: 0,
    totalPnl: 0,
    totalPnlPercent: 0,
    avgBuyPrice: 0,
    avgPrice: 0,
    change24h: 0,
  };

  return (
    <div className="tp-page">
      <div className="tp-sticky-wrapper">
        <header className="tp-header">
          <h1>
            {symbol?.toUpperCase()}
            {assetName && assetName !== symbol?.toUpperCase() && (
              <span className="tp-asset-name">{assetName}</span>
            )}
          </h1>
          <p className="tp-subtitle">История операций</p>
        </header>
        <section className="tp-section tp-section--summary">
          <AssetSummary data={safePosition} />
        </section>
      </div>

      <section className="tp-section tp-section--list">
        {transactions.length === 0 ? (
          <div className="tp-empty">
            <p>Нет транзакций для {symbol?.toUpperCase()}</p>
            <span className="tp-empty-hint">Добавь первую покупку или продажу</span>
          </div>
        ) : (
          <ul className="tp-list">
            {transactions.map((tx) => {
              const total = tx.amount * tx.price;
              const isBuy = tx.type === "BUY";
              const date = new Date(tx.createdAt);
              return (
                <li key={tx.id} className="tp-row">
                  <div className="tp-cell tp-cell--type">
                    <span className={`tp-badge ${isBuy ? "buy" : "sell"}`}>
                      {isBuy ? "Покупка" : "Продажа"}
                    </span>
                    <time className="tp-date">
                      {date.toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                  <div className="tp-cell tp-cell--details">
                    <div className="tp-amount-row">
                      <span className={`tp-amount ${isBuy ? "buy" : "sell"}`}>
                        {isBuy ? "+" : "-"}{tx.amount} {symbol?.toUpperCase()}
                      </span>
                      <span className="tp-at">по цене:</span>
                      <span className="tp-price">${tx.price.toFixed(2)}</span>
                    </div>
                    <div className="tp-total">
                      Всего: <strong>${total.toFixed(2)}</strong>
                    </div>
                  </div>
                  <div className="tp-cell tp-cell--actions">
                    <button className="btn-delete-icon" disabled title="Редактирование">
                      <Pencil size={18} />
                    </button>
                    <button className="btn-delete-icon" onClick={() => handleDelete(tx.id)} title="Удалить">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};