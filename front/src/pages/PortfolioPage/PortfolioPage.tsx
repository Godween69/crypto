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
  const portfolioQuery = usePortfolio();

  // Запрашиваем рыночные данные ТОЛЬКО для UI-полей (иконки, имена, ранги)
  const symbols = useMemo(
    () => portfolioQuery.data?.map((i) => i.symbol) ?? [],
    [portfolioQuery.data]
  );
  const marketQuery = useMarketData(symbols);

  // Безопасное слияние: бэкенд даёт финансы, маркет даёт UI-поля
  const items = useMemo(() => {
    if (!portfolioQuery.data) return [];
    const marketMap = new Map(
      marketQuery.data?.map((m) => [m.symbol.toUpperCase(), m]) ?? []
    );

    return portfolioQuery.data.map((item) => ({
      ...item,
      // Добавляем только UI-поля
      name: marketMap.get(item.symbol.toUpperCase())?.name ?? item.name,
      image: marketMap.get(item.symbol.toUpperCase())?.image ?? item.image,
      rank: marketMap.get(item.symbol.toUpperCase())?.rank ?? item.rank,
      coinId: marketMap.get(item.symbol.toUpperCase())?.coinId ?? item.coinId,
    }));
  }, [portfolioQuery.data, marketQuery.data]);

  const isLoading =
    portfolioQuery.isLoading ||
    (symbols.length > 0 && marketQuery.isLoading);

  const hasError = portfolioQuery.error || marketQuery.error;

  if (isLoading) return <div className="pp-state">Загрузка данных...</div>;
  if (hasError)
    return (
      <div className="pp-state pp-state--error">
        <p>Не удалось загрузить данные</p>
        <button onClick={() => { portfolioQuery.refetch(); marketQuery.refetch(); }}>
          Повторить
        </button>
      </div>
    );
  if (!items.length)
    return (
      <div className="pp-page">
        <header className="pp-header"></header>
        <div className="pp-empty">
          <p>Портфель пуст</p>
          <button className="btn-add" onClick={() => open(<TransactionForm onClose={close} />)}>
            +
          </button>
        </div>
      </div>
    );

  return (
    <div className="pp-page">
      <div className="pp-section-sum">
        <PortfolioSummary items={items} />
      </div>
      <div className="pp-section">
        <PortfolioGrid items={items} onOpen={(s) => navigate(`/portfolio/${s}`)} />
      </div>
    </div>
  );
};