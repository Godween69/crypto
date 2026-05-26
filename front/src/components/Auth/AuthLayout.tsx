// front/src/components/Auth/AuthLayout.tsx

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { AuthHero } from "./AuthHero";
import "./Auth.css";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

// Split-screen layout: слева форма, справа hero с брендингом
export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="auth-layout">
      {/* Hero-часть (скрывается на мобилках) */}
      <AuthHero />

      {/* Форма */}
      <div className="auth-layout__form-side">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="auth-layout__card"
        >
          <div className="auth-layout__header">
            <h2 className="auth-layout__title">{title}</h2>
            {subtitle && (
              <p className="auth-layout__subtitle">{subtitle}</p>
            )}
          </div>

          {children}
        </motion.div>

        <p className="auth-layout__footer">
          © {new Date().getFullYear()} CryptoFolio. Все права защищены.
        </p>
      </div>
    </div>
  );
};