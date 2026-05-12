//front\src\components\Modal\ModalProvider.tsx

import { useState } from 'react';
import type { ReactNode } from 'react';

import './Modal.css'

import { ModalContext } from './ModalContext';

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [content, setContent] = useState<ReactNode>(null);

  const open = (node: ReactNode) => setContent(node);
  const close = () => setContent(null);

  return (
    <ModalContext.Provider value={{ open, close }}>
      {children}

      {content && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {content}
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};