// front/src/components/Auth/FormField.tsx
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, XCircle } from "lucide-react";

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  id: string;
  validationStatus?: 'valid' | 'invalid' | 'checking' | null;
  validationMessage?: string;
}

// Обёртка над input с лейблом, хинтом и анимированной ошибкой
export const FormField = ({
  label,
  error,
  hint,
  children,
  id,
  validationStatus,
  validationMessage,
}: FormFieldProps) => {
  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-field__label">
        {label}
      </label>
      <div className={`auth-field__control ${error ? "auth-field__control--error" : ""} ${validationStatus === 'valid' ? 'auth-field__control--valid' : validationStatus === 'invalid' ? 'auth-field__control--invalid' : ''}`}>
        {children}

        {/* Иконка статуса валидации */}
        <AnimatePresence mode="wait">
          {validationStatus === 'valid' && (
            <motion.div
              key="valid"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="auth-field__status-icon auth-field__status-icon--valid"
              title="Домен разрешён"
            >
              <CheckCircle size={18} />
            </motion.div>
          )}
          {validationStatus === 'invalid' && (
            <motion.div
              key="invalid"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="auth-field__status-icon auth-field__status-icon--invalid"
              title="Домен не разрешён"
            >
              <XCircle size={18} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Сообщение валидации домена (показывается под input) */}
      <AnimatePresence mode="wait">
        {validationMessage && !error && (
          <motion.p
            key="validation"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`auth-field__validation ${validationStatus === 'valid' ? 'auth-field__validation--valid' : 'auth-field__validation--invalid'}`}
            role="status"
          >
            {validationMessage}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Хинт показывается только если нет ошибки и нет сообщения валидации */}
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
        ) : !validationMessage && hint ? (
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