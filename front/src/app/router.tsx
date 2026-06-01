// front/src/app/router.tsx

import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layout
import { RootLayout } from '../layouts/RootLayout';

// Страницы
import { PortfolioPage } from '../pages/PortfolioPage/PortfolioPage';
import { TransactionPage } from '../pages/TransactionsPage/TransactionsPage';
import { AnalyticsPage } from '../pages/AnalyticsPage/AnalyticsPage';
import { ErrorPage } from '../pages/ErrorPage/ErrorPage';
import { LoginPage } from '../pages/Auth/LoginPage';
import { RegisterPage } from '../pages/Auth/RegisterPage';
import { ForgotPasswordPage } from "../pages/Auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/Auth/ResetPasswordPage";
import { VerifyEmailPage } from "../pages/Auth/VerifyEmailPage"; // <-- ДОБАВЛЕН ИМПОРТ

// Компонент защиты
import { ProtectedRoute } from '../components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <RootLayout />
      </ProtectedRoute>
    ),
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Navigate to="/portfolio" replace /> },
      { path: 'portfolio', element: <PortfolioPage /> },
      { path: 'portfolio/:symbol', element: <TransactionPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> }, 
]);