import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { PortfolioGrid } from "../../components/Portfolio/PortfolioGrid/PortfolioGrid";
import { PortfolioSummary } from "../../components/Portfolio/PortfolioSummary/PortfolioSummary";
import { TransactionForm } from "../../components/TransactionForm/TransactionForm";

import { usePortfolio } from "../../hooks/usePortfolio";
import { useMarketData } from "../../hooks/useMarketData";
import { useModal } from "../../hooks/useModal";

import "./PortfolioPage.css";

export const PortfolioPage = () => {
  const navigate = useNavigate();
  const { open, close } = useModal();

  // 1. ЗАПРОСЫ ДАННЫХ (все хуки строго в начале)
  const portfolioQuery = usePortfolio();

  // Стабильный массив символов для market-запроса
  const symbols = useMemo(
    () => portfolioQuery.data?.map((i) => i.symbol) ?? [],
    [portfolioQuery.data]
  );

  const marketQuery = useMarketData(symbols);

  // 2. СТАБИЛЬНЫЕ ССЫЛКИ НА МАССИВЫ
  const portfolio = useMemo(() => portfolioQuery.data ?? [], [portfolioQuery.data]);
  const market = useMemo(() => marketQuery.data ?? [], [marketQuery.data]);

  const isLoading =
    portfolioQuery.isLoading ||
    (symbols.length > 0 && marketQuery.isLoading);
  const hasError = portfolioQuery.error || marketQuery.error;
  const refetchAll = () => {
    portfolioQuery.refetch();
    marketQuery.refetch();
  };

  // 3. MAP ДЛЯ БЫСТРОГО ДОСТУПА К РЫНОЧНЫМ ДАННЫМ
  const marketMap = useMemo(
    () => new Map(market.map((item) => [item.symbol, item])),
    [market]
  );

  // 4. ФОРМИРОВАНИЕ VIEW-МОДЕЛИ
  const view = useMemo(() => {
    return portfolio.map((item) => {
      const m = marketMap.get(item.symbol);
      const price = m?.currentPrice ?? 0;
      const totalValue = item.amount * price;
      const pnl = totalValue - item.invested;
      const pnlPercent = item.invested ? (pnl / item.invested) * 100 : 0;
      const change24h = m?.change24h ?? 0;

      // Формула: текущая стоимость * (процент изменения / 100)
      const change24hValue = totalValue * (change24h / 100);

      return {
        ...item,
        currentPrice: price,
        totalValue,
        pnl,
        pnlPercent,
        change24h,
        change24hValue,
      };
    });
  }, [portfolio, marketMap]);

  // 5. СОСТОЯНИЯ UI (строго после всех хуков и вычислений)
  if (isLoading) return <div className="pp-state">Загрузка данных...</div>;

  if (hasError) {
    return (
      <div className="pp-state pp-state--error">
        <p>Не удалось загрузить данные</p>
        <button onClick={refetchAll}>Повторить</button>
      </div>
    );
  }

  if (!portfolio.length) {
    return (
      <div className="pp-page">
        <header className="pp-header"><h1>Portfolio Dashboard</h1></header>
        <div className="pp-empty">
          <p>Портфель пуст</p>
          <button className="btn-add" onClick={() => open(<TransactionForm onClose={close} />)}>
            + 
          </button>
        </div>
      </div>
    );
  }

  // 6. ОБРАБОТЧИКИ
  const handleOpen = (symbol: string) => navigate(`/portfolio/${symbol}`);
  const handleCreateTransaction = () => open(<TransactionForm onClose={close} />);

  // 7. РЕНДЕР
  return (
    <div className="pp-page">
      <header className="pp-header">
        <h1>Portfolio Dashboard</h1>
        <button
          className="btn-refresh"
          onClick={refetchAll}
          disabled={isLoading}
          aria-label="Обновить данные"
        >
          ↻
        </button>
      </header>

      <div className="pp-section">
        <PortfolioSummary items={view} />
      </div>

      <button className="btn-add" onClick={handleCreateTransaction} aria-label="Добавить транзакцию">
        +
      </button>

      <div className="pp-section">
        <PortfolioGrid items={view} onOpen={handleOpen} />
      </div>
    </div>
  );
};