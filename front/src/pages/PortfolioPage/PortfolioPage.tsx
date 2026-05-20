// front/src/pages/PortfolioPage/PortfolioPage.tsx

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

// Компоненты UI
import { PortfolioGrid } from "../../components/Portfolio/PortfolioGrid/PortfolioGrid";
import { PortfolioSummary } from "../../components/Portfolio/PortfolioSummary/PortfolioSummary";
import { TransactionForm } from "../../components/TransactionForm/TransactionForm";

// Хуки для получения данных
import { usePortfolio } from "../../hooks/usePortfolio";
import { useMarketData } from "../../hooks/useMarketData";
import { useModal } from "../../hooks/useModal";

import "./PortfolioPage.css";

export const PortfolioPage = () => {
  // useNavigate — хук для программной навигации (переход на страницу актива)
  const navigate = useNavigate();

  // useModal — кастомный хук для управления модальными окнами
  const { open, close } = useModal();

  // =========================
  // 1. ЗАПРОС ПОРТФЕЛЯ (БД)
  // =========================
  // usePortfolio возвращает: { data, isLoading, error, refetch }
  const portfolioQuery = usePortfolio();

  // Извлекаем символы монет для запроса рыночных цен
  // ВАЖНО: используем useMemo, чтобы массив не пересоздавался при каждом рендере
  // Это предотвращает лишние запросы к useMarketData
  const symbols = useMemo(
    () => portfolioQuery.data?.map((i) => i.symbol) ?? [],
    [portfolioQuery.data] // пересчитываем только когда изменились данные портфеля
  );

  // =========================
  // 2. ЗАПРОС РЫНОЧНЫХ ДАННЫХ (CoinGecko API)
  // =========================
  // useMarketData делает запрос к /market?symbols=BTC,ETH,LINK
  // Возвращает массив объектов: { symbol, currentPrice, change24h, name, image, ... }
  const marketQuery = useMarketData(symbols);

  // =========================
  // 3. БЕЗОПАСНЫЕ МАССИВЫ (защита от undefined)
  // =========================
  // portfolioQuery.data может быть undefined во время загрузки
  // useMemo гарантирует, что мы всегда работаем с массивом (даже пустым)
  const portfolio = useMemo(
    () => portfolioQuery.data ?? [],
    [portfolioQuery.data]
  );

  // Аналогично для рыночных данных
  const market = useMemo(
    () => marketQuery.data ?? [],
    [marketQuery.data]
  );

  // =========================
  // 4. СОСТОЯНИЯ ЗАГРУЗКИ И ОШИБОК
  // =========================
  // isLoading = загружается портфель ИЛИ (есть символы И загружаются рыночные данные)
  // Это предотвращает показ "пустого" состояния, пока данные ещё грузятся
  const isLoading =
    portfolioQuery.isLoading ||
    (symbols.length > 0 && marketQuery.isLoading);

  // hasError = ошибка в любом из запросов
  const hasError = portfolioQuery.error || marketQuery.error;

  // Функция для повторного запроса обоих источников данных
  const refetchAll = () => {
    portfolioQuery.refetch();
    marketQuery.refetch();
  };

  // =========================
  // 5. MARKET MAP (FIX: нормализация регистра)
  // =========================
  // Создаём Map для быстрого поиска рыночных данных по символу: O(1) вместо O(n)
  // КРИТИЧНО: приводим символ к верхнему регистру, чтобы "btc" и "BTC" совпадали
  const marketMap = useMemo(() => {
    return new Map(
      market.map((item) => [
        item.symbol.toUpperCase(),
        item,
      ])
    );
  }, [market]); // пересоздаём карту только когда изменились рыночные данные

  // =========================
  // 6. VIEW MODEL (ГЛАВНОЕ: расчёт производных данных)
  // =========================
  // Здесь мы "обогащаем" сырые данные из БД рыночными данными и считаем метрики
  const view = useMemo(() => {
    return portfolio.map((item) => {
      // Ищем рыночные данные по символу (с нормализацией регистра)
      const m = marketMap.get(item.symbol.toUpperCase());

      // Безопасное извлечение цены (если нет данных — 0)
      const price = m?.currentPrice ?? 0;

      // Текущая стоимость позиции: количество × цена
      const totalValue = item.amount * price;

      // PnL (прибыль/убыток): текущая стоимость − вложенные средства
      const pnl = totalValue - item.invested;

      // PnL в процентах: (прибыль / вложения) × 100
      // Защита от деления на 0: если invested = 0 → процент = 0
      const pnlPercent = item.invested
        ? (pnl / item.invested) * 100
        : 0;

      // ИЗМЕНЕНИЕ ЗА 24 ЧАСА (процент от CoinGecko)
      const change24h = m?.change24h ?? 0;

      const change24hValue = totalValue * (change24h / 100);

      return {
        // Копируем все поля из исходного item (symbol, amount, invested, avgPrice)
        ...item,

        // Прокидываем ВСЕ поля из рыночных данных (name, image, rank, coinId, ...)
        ...m,

        // Переопределяем/добавляем вычисленные поля
        currentPrice: price,
        totalValue,               // текущая стоимость позиции
        pnl,                      // абсолютный PnL
        pnlPercent,               // PnL в процентах
        change24h,                // процент изменения за 24ч (для карточки)
        change24hValue,           // абсолютное изменение в $ (для сводки)
      };
    });
  }, [portfolio, marketMap]); // пересчитываем только при изменении входных данных

  // =========================
  // 7. ОТРИСОВКА СОСТОЯНИЙ (LOADING / ERROR / EMPTY)
  // =========================

  // Состояние загрузки
  if (isLoading) {
    return <div className="pp-state">Загрузка данных...</div>;
  }

  // Состояние ошибки
  if (hasError) {
    return (
      <div className="pp-state pp-state--error">
        <p>Не удалось загрузить данные</p>
        <button onClick={refetchAll}>Повторить</button>
      </div>
    );
  }

  // Пустой портфель (нет транзакций)
  if (!portfolio.length) {
    return (
      <div className="pp-page">
        <header className="pp-header">
          {/* <h1>Портфолио</h1> */}
        </header>

        <div className="pp-empty">
          <p>Портфель пуст</p>

          {/* Кнопка открытия модального окна с формой транзакции */}
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
  // 8. ОБРАБОТЧИКИ СОБЫТИЙ
  // =========================

  // Переход на страницу детали актива: /portfolio/BTC
  const handleOpen = (symbol: string) =>
    navigate(`/portfolio/${symbol}`);

  // =========================
  // 9. ОСНОВНОЙ РЕНДЕР
  // =========================
  return (
    <div className="pp-page">

      {/* Сводка портфеля: закрепляем сверху при скролле */}
      <div className="pp-section-sum ">
        <PortfolioSummary items={view} />
      </div>

      {/* Сетка карточек активов — скроллится под зафиксированной сводкой */}
      <div className="pp-section">
        <PortfolioGrid
          items={view}
          onOpen={handleOpen}
        />
      </div>
    </div>
  );
};