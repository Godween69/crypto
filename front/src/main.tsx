import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import './index.css';

import { QueryProvider } from './providers/QueryProvider';
import { ModalProvider } from './components/Modal/ModalProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <ModalProvider>
        <App />
      </ModalProvider>
    </QueryProvider>
  </React.StrictMode>
);