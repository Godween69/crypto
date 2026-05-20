import { useParams } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";

import { AssetSummary } from "../../components/Portfolio/AssetSummary/AssetSummary";
import { calculateAssetPosition } from "../../utils/calculateAssetPosition";
import { useTransactions } from "../../hooks/useTransactions";
import { useDeleteTransaction } from "../../hooks/useDeleteTransaction";
import { useMarketData } from "../../hooks/useMarketData";
import { formatCoinName } from "../../utils/formatCoinName"; // 🔹 Импорт утилиты форматирования

import "./TransactionsPage.css";

export const TransactionPage = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const { mutate: deleteTx } = useDeleteTransaction();

  const transactionsQuery = useTransactions(symbol ?? "");
  const transactions = transactionsQuery.data ?? [];

  const marketQuery = useMarketData(symbol ? [symbol] : []);
  const market = marketQuery.data ?? [];

  // 🔹 ПОЛУЧЕНИЕ ФОРМАТИРОВАННОГО НАЗВАНИЯ
  // Передаём name, coinId и symbol в утилиту для безопасного fallback
  const marketItem = market[0];
  const assetName = formatCoinName(
    marketItem?.name,
    marketItem?.coinId,
    symbol
  );

  // States
  if (!symbol) return <div className="tp-state">Неверный символ</div>;
  if (transactionsQuery.isPending || marketQuery.isPending) {
    return <div className="tp-state tp-state--loading">Загрузка...</div>;
  }
  if (transactionsQuery.error || marketQuery.error) {
    return (
      <div className="tp-state tp-state--error">
        <p>Ошибка загрузки данных</p>
        <button onClick={() => { transactionsQuery.refetch(); marketQuery.refetch(); }}>
          Повторить
        </button>
      </div>
    );
  }

  const handleDelete = (id: string) => {
    if (!confirm("Удалить транзакцию?")) return;
    deleteTx(id);
  };

  const currentPrice = marketItem?.currentPrice ?? 0;
  const position = calculateAssetPosition(symbol, transactions, currentPrice);

  return (
    <div className="tp-page">

      {/* ===== STICKY HEADER & SUMMARY ===== */}
      <div className="tp-sticky-wrapper">
        <header className="tp-header">
          <h1>
            {symbol?.toUpperCase()}
            {/* 🔹 Выводим название только если оно есть и не дублирует тикер */}
            {assetName && assetName !== symbol?.toUpperCase() && (
              <span className="tp-asset-name">{assetName}</span>
            )}
          </h1>
          <p className="tp-subtitle">История операций</p>
        </header>

        <section className="tp-section tp-section--summary">
          <AssetSummary data={position} />
        </section>
      </div>

      {/* ===== TRANSACTIONS LIST ===== */}
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
                      <span className="tp-at">@</span>
                      <span className="tp-price">${tx.price.toFixed(2)}</span>
                    </div>
                    <div className="tp-total">
                      Всего: <strong>${total.toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="tp-cell tp-cell--actions">
                    <button
                      className="btn-delete-icon"
                      disabled
                      title="Редактирование"
                      aria-label="Редактировать транзакцию"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      className="btn-delete-icon"
                      onClick={() => handleDelete(tx.id)}
                      title="Удалить"
                      aria-label="Удалить транзакцию"
                    >
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