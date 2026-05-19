// front/src/app/router.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layout
import { RootLayout } from '../layouts/RootLayout';

// Страницы
import { PortfolioPage } from '../pages/PortfolioPage/PortfolioPage';
import { TransactionPage } from '../pages/TransactionsPage/TransactionsPage';
import { AnalyticPage } from '../pages/AnaliticPage/AnaliticPage';

import { ErrorPage } from '../pages/ErrorPage/ErrorPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      // Редирект с корня на /portfolio
      { index: true, element: <Navigate to="/portfolio" replace /> },

      // Основные страницы
      { path: 'portfolio', element: <PortfolioPage /> },
      { path: 'portfolio/:symbol', element: <TransactionPage /> },
      { path: 'analytics', element: <AnalyticPage /> },
    ],
  },
]);