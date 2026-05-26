// front/src/components/Auth/FormField.tsx

import type { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  id: string;
}

// Обёртка над input с лейблом, хинтом и анимированной ошибкой
export const FormField = ({
  label,
  error,
  hint,
  children,
  id,
}: FormFieldProps) => {
  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-field__label">
        {label}
      </label>

      <div className={`auth-field__control ${error ? "auth-field__control--error" : ""}`}>
        {children}
      </div>

      {/* Хинт показывается только если нет ошибки */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.2 }}
            className="auth-field__error"
            role="alert"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="auth-field__hint"
          >
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
};