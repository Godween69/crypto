import { useParams } from "react-router-dom";

import { AssetSummary } from "../../components/Portfolio/AssetSummary/AssetSummary";
import { calculateAssetPosition } from "../../utils/calculateAssetPosition";

import { useTransactions } from "../../hooks/useTransactions";
import { useDeleteTransaction } from "../../hooks/useDeleteTransaction";
import { useMarketData } from "../../hooks/useMarketData";

import type { Transaction } from "../../types/transaction.types";

import "./TransactionsPage.css";

export const TransactionPage = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const { mutate: deleteTx } = useDeleteTransaction();

  const isValid = !!symbol;

  // =========================
  // 1. ТРАНЗАКЦИИ (БД)
  // =========================
  const transactionsQuery = useTransactions(symbol ?? "");
  const transactions = transactionsQuery.data ?? [];

  // =========================
  // 2. РЫНОЧНАЯ ЦЕНА (внешний API)
  // =========================
  const marketQuery = useMarketData(symbol ? [symbol] : []);
  const market = marketQuery.data ?? [];

  // =========================
  // 3. СОСТОЯНИЯ ЗАГРУЗКИ И ОШИБОК
  // =========================
  if (!isValid) return <div className="tp-state">Неверный символ</div>;

  if (transactionsQuery.isPending || marketQuery.isPending) {
    return <div className="tp-state">Загрузка...</div>;
  }

  if (transactionsQuery.error || marketQuery.error) {
    return (
      <div className="tp-state tp-state--error">
        <p>Ошибка загрузки данных</p>
        <button onClick={() => {
          transactionsQuery.refetch();
          marketQuery.refetch();
        }}>
          Повторить
        </button>
      </div>
    );
  }

  // =========================
  // 4. ОБРАБОТЧИКИ
  // =========================
  const handleDelete = (id: string) => {
    if (!confirm("Удалить транзакцию?")) return;
    deleteTx(id);
  };

  // =========================
  // 5. РАСЧЁТ ПОЗИЦИИ
  // =========================
  const currentPrice = market[0]?.currentPrice ?? 0;
  const position = calculateAssetPosition(symbol!, transactions, currentPrice);

  // =========================
  // 6. РЕНДЕР
  // =========================
  return (
    <div className="tp-page">
      <header className="tp-header">
        <h1>{symbol} покупки / продажи</h1>
      </header>

      <div className="tp-section">
        <AssetSummary data={position} />
      </div>

      <div className="tp-list">
        {transactions.length === 0 ? (
          <div className="tp-empty">Нет транзакций</div>
        ) : (
          transactions.map((tx: Transaction) => {
            const total = tx.amount * tx.price;
            const sign = tx.type === "BUY" ? "+" : "-";
            const operation = tx.type === "BUY" ? "Купить" : "Продать";

            return (
              <div key={tx.id} className="tp-row">
                <div className="tp-left">
                  <div className={`tp-type tp-type--${tx.type}`}>
                    {operation}
                  </div>
                  <div className="tp-date">
                    {new Date(tx.createdAt).toLocaleDateString("ru-RU", {
                      year: "numeric",
                      month: "long",
                      day: "2-digit",
                    })}
                  </div>
                </div>

                <div className="tp-actions">
                  <button className="tp-btn">Edit</button>
                  <button
                    className="tp-btn tp-btn--danger"
                    onClick={() => handleDelete(tx.id)}
                  >
                    Delete
                  </button>
                </div>

                <div className="tp-right">
                  <div className="tp-line">
                    <span className={`tp-amount tp-amount--${tx.type}`}>
                      {sign} {tx.amount} {tx.symbol}
                    </span>
                    <span className="tp-meta">по</span>
                    <span className="tp-strong">{tx.price}$</span>
                  </div>
                  <div className="tp-line">
                    <span className="tp-meta">всего</span>
                    <span className="tp-strong">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};