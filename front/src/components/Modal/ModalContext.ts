import { createContext } from "react";
import type { ReactNode } from "react";

export type ModalContextType = {
  open: (node: ReactNode) => void;
  close: () => void;
};

export const ModalContext = createContext<ModalContextType | null>(null);
