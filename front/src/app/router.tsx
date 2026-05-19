// front/src/app/router.tsx
import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from '../layouts/RootLayout';

// страницы
import { PortfolioPage } from '../pages/PortfolioPage/PortfolioPage';
import { TransactionPage } from '../pages/TransactionsPage/TransactionsPage';
import { AnaliticPage } from '../pages/AnaliticPage/AnaliticPage';

export const router = createBrowserRouter([
  {
    // Корневой лейаут: содержит Navbar + Outlet
    element: <RootLayout />,
    children: [
      { path: '/portfolio', element: <PortfolioPage /> },
      { path: '/portfolio/:symbol', element: <TransactionPage /> },
      { path: '/analitics', element: < AnaliticPage /> },

    ],
  },
]);