// front/src/components/Portfolio/PortfolioSummary/PortfolioSummary.tsx

import { useMemo } from "react";
import type { PortfolioItem } from "../../../types/portfolio.types";
import "./PortfolioSummary.css";

// Форматирование числа до двух знаков после запятой
const fmt = (n: number) => n.toFixed(2);

// Форматирование с обязательным знаком (+ для прибыли, - для убытка)
const fmtSign = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;

interface Props {
  items: PortfolioItem[]; // Массив обогащённых данных портфеля с бэкенда
}

export const PortfolioSummary = ({ items }: Props) => {
  // Агрегация финансовых метрик по всему портфелю
  const stats = useMemo(() => {
    let currentValue = 0;           // Текущая рыночная стоимость всех открытых позиций
    let totalRealizedPnl = 0;       // Суммарная зафиксированная прибыль/убыток от продаж
    let totalUnrealizedPnl = 0;     // Суммарная "бумажная" прибыль/убыток по открытым позициям
    let totalGrossInvested = 0;     // Историческая сумма всех покупок (стабильная база для ROI)
    let totalValueYesterday = 0;    // Приблизительная стоимость портфеля 24 часа назад

    for (const i of items) {
      const currentVal = i.totalValue ?? 0;
      currentValue += currentVal;

      totalRealizedPnl += i.realizedPnl ?? 0;
      totalUnrealizedPnl += i.pnl ?? 0;
      // Используем totalInvested (сумма всех BUY), а не netInvested (BUY - SELL)
      // Это исключает деление на 0/отрицательное число при полном выводе тела депозита
      totalGrossInvested += i.totalInvested ?? 0;

      // Восстанавливаем стоимость позиции "вчера" через обратный процент
      // Формула: ValueYesterday = CurrentValue / (1 + change24h% / 100)
      const change24hPercent = i.change24h ?? 0;
      if (currentVal > 0 && !isNaN(change24hPercent)) {
        const prevVal = currentVal / (1 + change24hPercent / 100);
        totalValueYesterday += prevVal;
      } else {
        totalValueYesterday += currentVal; // Фоллбэк при отсутствии рыночных данных
      }
    }

    // Общий PnL = зафиксированный результат + текущая бумажная прибыль/убыток
    const totalPnl = totalRealizedPnl + totalUnrealizedPnl;

    // ROI портфеля: отношение общего PnL к исторической сумме всех вложений
    const totalPnlPercent = totalGrossInvested > 0 ? (totalPnl / totalGrossInvested) * 100 : 0;

    // Абсолютное и процентное изменение стоимости за последние 24 часа
    const change24hValue = currentValue - totalValueYesterday;
    const change24hPercentTotal = totalValueYesterday > 0
      ? (change24hValue / totalValueYesterday) * 100
      : 0;

    return {
      currentValue,
      totalPnl,
      totalPnlPercent,
      totalUnrealizedPnl,
      totalRealizedPnl,
      change24hValue,
      change24hPercent: change24hPercentTotal,
      hasRealizedPnl: Math.abs(totalRealizedPnl) > 0.01, // Флаг для условного рендера блока реализованного PnL
      totalGrossInvested,
    };
  }, [items]);

  // Состояние пустого портфеля
  if (!items.length) {
    return <div className="portfolio-summary portfolio-summary--empty"><span>Портфель пуст</span></div>;
  }

  // Хелперы для динамических CSS-классов и визуальных маркеров
  const getPnlClass = (val: number) => (val > 0 ? "up" : val < 0 ? "down" : "neutral");
  const getArrow = (val: number) => (val > 0 ? "▲" : val < 0 ? "▼" : "●");

  const class24h = getPnlClass(stats.change24hValue);
  const classTotalPnl = getPnlClass(stats.totalPnl);
  const classUnrealized = getPnlClass(stats.totalUnrealizedPnl);
  const classRealized = getPnlClass(stats.totalRealizedPnl);

  return (
    <div className="portfolio-summary" role="region" aria-label="Сводка портфеля">
      {/* 1. Текущая рыночная стоимость портфеля */}
      <div className="ps-row ps-main">
        <span className="ps-label">Текущая стоимость:</span>
        <span className="ps-value-large">${fmt(stats.currentValue)}</span>
      </div>

      {/* 2. Динамика за последние 24 часа */}
      <div className="ps-row ps-secondary">
        <span className="ps-label">За 24 часа:</span>
        <div className={`ps-pill ${class24h}`}>
          <span className="ps-icon">{getArrow(stats.change24hValue)}</span>
          <span>{fmtSign(stats.change24hValue)}$ ({fmt(stats.change24hPercent)}%)</span>
        </div>
      </div>

      <div className="ps-divider"></div>

      {/* 3. Весь обьем инвестиций(реально вложенный) */}
      <div className="ps-row ps-totalInvested">
        <span className="ps-label">Всего проинвестировано: </span>
        <span className="ps-value-large">{`${fmt(stats.totalGrossInvested)}$`}</span>
      </div>

      <div className="ps-divider"></div>

      {/* 4. Общий финансовый результат (сумма реализованного и нереализованного) */}
      <div className="ps-row ps-highlight">
        <span className="ps-label">Общий результат (PnL):</span>
        <div className={`ps-total-pnl ${classTotalPnl}`}>
          <span className="ps-icon">{getArrow(stats.totalPnl)}</span>
          <span className="ps-value-bold">{fmtSign(stats.totalPnl)}$</span>
          <span className="ps-percent">({fmt(stats.totalPnlPercent)}%)</span>
        </div>
      </div>

      {/* 5. Детализация PnL: прозрачное разделение на бумажный и зафиксированный */}
      <div className="ps-breakdown">
        <div className="ps-detail-row">
          <span className="ps-detail-label">Нереализованный:</span>
          <span className={`ps-detail-value ${classUnrealized}`}>
            {fmtSign(stats.totalUnrealizedPnl)}$
          </span>
        </div>

        {/* Рендерим блок реализованного PnL только при наличии зафиксированных сделок */}
        {stats.hasRealizedPnl && (
          <div className="ps-detail-row">
            <span className="ps-detail-label">Реализованный:</span>
            <span className={`ps-detail-value ${classRealized}`}>
              {fmtSign(stats.totalRealizedPnl)}$
            </span>
          </div>
        )}
      </div>
    </div>
  );
};