// front/src/pages/PortfolioPage/PortfolioPage.tsx

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

  // =========================
  // 1. PORTFOLIO QUERY
  // =========================
  const portfolioQuery = usePortfolio();

  // symbols для market API (ВАЖНО: без mutation sort)
  const symbols = useMemo(
    () => portfolioQuery.data?.map((i) => i.symbol) ?? [],
    [portfolioQuery.data]
  );

  // =========================
  // 2. MARKET QUERY
  // =========================
  const marketQuery = useMarketData(symbols);

  // =========================
  // 3. SAFE ARRAYS
  // =========================
  const portfolio = useMemo(
    () => portfolioQuery.data ?? [],
    [portfolioQuery.data]
  );

  const market = useMemo(
    () => marketQuery.data ?? [],
    [marketQuery.data]
  );

  // =========================
  // 4. LOADING / ERROR STATE
  // =========================
  const isLoading =
    portfolioQuery.isLoading ||
    (symbols.length > 0 && marketQuery.isLoading);

  const hasError = portfolioQuery.error || marketQuery.error;

  const refetchAll = () => {
    portfolioQuery.refetch();
    marketQuery.refetch();
  };

  // =========================
  // 5. MARKET MAP (FIX CASE BUG)
  // =========================
  const marketMap = useMemo(() => {
    return new Map(
      market.map((item) => [
        item.symbol.toUpperCase(), // 🔥 FIX: normalize
        item,
      ])
    );
  }, [market]);

  // =========================
  // 6. VIEW MODEL (MAIN FIX AREA)
  // =========================
  const view = useMemo(() => {
    return portfolio.map((item) => {
      const m = marketMap.get(item.symbol.toUpperCase()); // 🔥 FIX

      const price = m?.currentPrice ?? 0;
      const totalValue = item.amount * price;
      const pnl = totalValue - item.invested;
      const pnlPercent = item.invested
        ? (pnl / item.invested) * 100
        : 0;

      const change24h = m?.change24h ?? 0;

      return {
        ...item,

        // 🔥 ВАЖНО: прокидываем ВСЕ market данные
        ...m,

        currentPrice: price,
        totalValue,
        pnl,
        pnlPercent,
        change24h,
      };
    });
  }, [portfolio, marketMap]);

  // =========================
  // 7. UI STATES
  // =========================
  if (isLoading) {
    return <div className="pp-state">Загрузка данных...</div>;
  }

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
        <header className="pp-header">
          <h1>Portfolio Dashboard</h1>
        </header>

        <div className="pp-empty">
          <p>Портфель пуст</p>

          <button
            className="btn-add"
            onClick={() =>
              open(<TransactionForm onClose={close} />)
            }
          >
            +
          </button>
        </div>
      </div>
    );
  }

  // =========================
  // 8. HANDLERS
  // =========================
  const handleOpen = (symbol: string) =>
    navigate(`/portfolio/${symbol}`);

  const handleCreateTransaction = () =>
    open(<TransactionForm onClose={close} />);

  // =========================
  // 9. RENDER
  // =========================
  return (
    <div className="pp-page">
      <header className="pp-header">
        <h1>Portfolio Dashboard</h1>

        <button
          className="btn-refresh"
          onClick={refetchAll}
          disabled={isLoading}
        >
          ↻
        </button>
      </header>

      <div className="pp-section">
        <PortfolioSummary items={view} />
      </div>

      <button
        className="btn-add"
        onClick={handleCreateTransaction}
      >
        +
      </button>

      <div className="pp-section">
        <PortfolioGrid
          items={view}
          onOpen={handleOpen}
        />
      </div>
    </div>
  );
};