// front/src/layouts/RootLayout.tsx

import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar/Navbar';
import './RootLayout.css';

export const RootLayout = () => {
  return (
    <div className="app-layout">
      {/* Navbar рендерится один раз и остаётся на всех страницах */}
      <Navbar />

      {/* Outlet подставляет текущую страницу (HomePage, PortfolioPage и т.д.) */}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};