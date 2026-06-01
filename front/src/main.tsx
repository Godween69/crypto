// front\src\main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import Lenis from 'lenis'; // Импорт библиотеки плавного скролла

import App from './App';
import './index.css';

import { QueryProvider } from './providers/QueryProvider';
import { ModalProvider } from './components/Modal/ModalProvider';

// Инициализация Lenis (Настройка физики скролла)
const lenis = new Lenis({
  duration: 1.3, // Длительность инерции (1.3s)
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Формула замедления
  smoothWheel: true, // Включаем плавность для колеса мыши
});

// Цикл анимации (синхронизация с частотой обновления монитора)
// Это "сердце" плавного скролла, обновляем позицию 60+ раз в секунду
function raf(time: number) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <ModalProvider>
        <App />
      </ModalProvider>
    </QueryProvider>
  </React.StrictMode>
);