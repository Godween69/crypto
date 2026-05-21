// front/src/pages/AnalyticsPage/AnalyticsPage.tsx
import { PortfolioDistributionChart } from '../../components/Analytics/PortfolioDistributionChart/PortfolioDistributionChart';
import { ChartPanel } from '../../components/Analytics/ChartPanel/ChartPanel';
import './AnalyticsPage.css';

export const AnalyticsPage = () => {
  return (
    <div className="analytics-page">
      <ChartPanel title="Распределение портфеля">
        <PortfolioDistributionChart />
      </ChartPanel>
    </div>
  );
};