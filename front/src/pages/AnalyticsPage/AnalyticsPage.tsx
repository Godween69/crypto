// front/src/pages/AnalyticsPage/AnalyticsPage.tsx
import { PortfolioDistributionChart } from '../../components/Analytics/PortfolioDistributionChart/PortfolioDistributionChart';

import { PortfolioIndexChart } from '../../components/Analytics/PortfolioIndexChart/PortfolioIndexChart';

import { ChartPanel } from '../../components/Analytics/ChartPanel/ChartPanel';
import './AnalyticsPage.css';

export const AnalyticsPage = () => {
  return (
    <div className="analytics-page">
      {/* Панель распределения активов */}
      <ChartPanel title="Распределение портфеля">
        <PortfolioDistributionChart />
      </ChartPanel>

      {/* Панель динамики индекса */}
      <ChartPanel title="Динамика портфеля">
        <PortfolioIndexChart />
      </ChartPanel>
    </div>
  );
};