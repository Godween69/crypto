// front/src/App.tsx

import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { router } from './app/router';
import { useAuthStore } from './store/authStore';
import { useMarketSocket } from './hooks/useMarketSocket';
import './App.css';

export default function App() {
  const { checkAuth } = useAuthStore();
  const queryClient = useQueryClient();
  
  const userId = useAuthStore((state) => state.user?.id);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Проверка сессии при старте
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // ЖЕСТКАЯ ОЧИСТКА КЭША при смене пользователя
  // Это предотвращает "утечку" данных между сессиями
  useEffect(() => {
    if (isAuthenticated && userId) {
      console.log(`[App] Смена пользователя на ${userId}. Полная очистка кэша.`);
      // Удаляем ВСЕ запросы, связанные с пользовательскими данными
      queryClient.removeQueries({ queryKey: ['portfolio'] });
      queryClient.removeQueries({ queryKey: ['transactions'] });
      queryClient.removeQueries({ queryKey: ['portfolio-index'] });
    }
  }, [userId, isAuthenticated, queryClient]);

  useMarketSocket();

  return <RouterProvider router={router} />;
}