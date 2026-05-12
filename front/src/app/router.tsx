// front/src/router.tsx

import { createBrowserRouter } from 'react-router-dom';

import { PortfolioPage } from '../pages/PortfolioPage/PortfolioPage';
import { TransactionPage } from '../pages/TransactionsPage/TransactionsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PortfolioPage />,
  },
  {
    path: '/portfolio/:symbol',
    element: <TransactionPage />,
  },
]);