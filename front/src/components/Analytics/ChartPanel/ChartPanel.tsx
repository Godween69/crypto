// front/src/components/Analytics/ChartPanel/ChartPanel.tsx

import type { ReactNode } from 'react';
import './ChartPanel.css';

type Props = { title: string; children: ReactNode };

export const ChartPanel = ({ title, children }: Props) => {
  return (
    <div className="chart-panel">
      <header className="chart-panel__header">
        <h3 className="chart-panel__title">{title}</h3>
      </header>
      <div className="chart-panel__body">
        {children}
      </div>
    </div>
  );
};