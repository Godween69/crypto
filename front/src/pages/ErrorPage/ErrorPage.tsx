// front/src/pages/ErrorPage/ErrorPage.tsx
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

// ✅ Строгий тип для ошибки (без any)
type RouteError = Error | { status?: number; statusText?: string; message?: string } | null;

export const ErrorPage = () => {
  const error = useRouteError() as RouteError;

  // ✅ Безопасная проверка на 404/500 через type-guard от React Router
  const isErrorResponse = isRouteErrorResponse(error);

  // ✅ Извлечение данных с дефолтными значениями (защита от undefined)
  const status = isErrorResponse ? error.status : 500;
  const statusText = isErrorResponse ? error.statusText : 'Внутренняя ошибка';
  const message = error?.message || 'Произошла непредвиденная ошибка';

  // ✅ Показываем детали только в режиме разработки
  const isDev = import.meta.env.DEV;

  return (
    <div className="error-page">
      <div className="error-card">
        <div className="error-icon">
          <AlertCircle size={48} />
        </div>

        <h1 className="error-title">
          {status === 404 ? 'Страница не найдена' : 'Что-то пошло не так'}
        </h1>

        <p className="error-message">
          {status === 404
            ? 'Запрошенная страница не существует или была перемещена.'
            : status === 500
              ? 'Сервер столкнулся с проблемой. Попробуйте позже.'
              : 'Не удалось загрузить контент.'}
        </p>

        {/* ✅ Детали ошибки — только в dev-режиме */}
        {isDev && (
          <details className="error-details">
            <summary>Техническая информация (dev)</summary>
            <code>
              Status: {status}
              <br />
              StatusText: {statusText}
              <br />
              Message: {message}
              {error instanceof Error && error.stack && (
                <>
                  <br />
                  <pre>{error.stack}</pre>
                </>
              )}
            </code>
          </details>
        )}

        <div className="error-actions">
          <Link to="/portfolio" className="btn-primary">
            <Home size={18} />
            В портфель
          </Link>
          <button onClick={() => window.location.reload()} className="btn-secondary">
            <RefreshCw size={18} />
            Обновить
          </button>
        </div>
      </div>
    </div>
  );
};