import { useContext } from "react";
import { ModalContext } from "../components/Modal/ModalContext";

export const useModal = () => {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("ModalProvider is missing");
  return ctx;
};
