// front/src/components/Portfolio/PortfolioGrid/PortfolioGrid.tsx

import type { PortfolioItem } from "../../../types/portfolio.types";
import { PortfolioCard } from "../PortfolioCard/PortfolioCard";

import './PortfolioGrid.css'

interface Props {
  items: PortfolioItem[];
  onOpen: (symbol: string) => void;
}

export const PortfolioGrid = ({ items, onOpen }: Props) => {

  return (
    <div className="portfolio-grid">
      {items.map((item) => (
        <div key={item.symbol} className="portfolio-grid-item">

          <PortfolioCard
            item={item}
            onOpen={onOpen}
          />

        </div>
      ))}
    </div>
  );
};