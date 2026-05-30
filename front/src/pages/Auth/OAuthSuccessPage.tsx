// front/src/pages/Auth/OAuthSuccessPage.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { AuthLayout } from "../../components/Auth/AuthLayout";

// Страница-прослойка после редиректа с бэкенда
// Бэкенд уже установил httpOnly куки, нужно синхронизировать Zustand-стор
export function OAuthSuccessPage() {
  const navigate = useNavigate();
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    // Вызываем checkAuth для синхронизации стора с установленными куками
    checkAuth()
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [checkAuth]);

  // После успешной синхронизации — редирект в приложение
  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => navigate("/portfolio"), 1500);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  // Рендер загрузки
  if (status === "loading") {
    return (
      <AuthLayout title="Вход через Яндекс">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: "center", padding: "2rem 0" }}
        >
          <Loader2
            size={40}
            style={{
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem",
              color: "var(--auth-accent)",
            }}
          />
          <p style={{ color: "#9ca3af" }}>Синхронизируем сессию...</p>
        </motion.div>
      </AuthLayout>
    );
  }

  // Рендер ошибки
  if (status === "error") {
    return (
      <AuthLayout title="Ошибка входа">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: "center", padding: "2rem 0" }}
        >
          <AlertCircle
            size={48}
            style={{ margin: "0 auto 1rem", color: "#ef4444" }}
          />
          <h3 style={{ margin: "0 0 0.5rem", color: "#fff" }}>
            Не удалось войти
          </h3>
          <p style={{ color: "#9ca3af", marginBottom: "1.5rem" }}>
            Произошла ошибка при авторизации через Яндекс.
          </p>
          <button
            onClick={() => navigate("/login")}
            style={{
              background: "var(--auth-accent)",
              color: "#0a0a0f",
              border: "none",
              padding: "10px 20px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Вернуться ко входу
          </button>
        </motion.div>
      </AuthLayout>
    );
  }

  // Рендер успеха
  return (
    <AuthLayout title="Успешный вход">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ textAlign: "center", padding: "2rem 0" }}
      >
        <CheckCircle
          size={48}
          style={{ margin: "0 auto 1rem", color: "#22c55e" }}
        />
        <h3 style={{ margin: "0 0 0.5rem", color: "#fff" }}>
          Добро пожаловать!
        </h3>
        <p style={{ color: "#9ca3af" }}>Перенаправляем в портфель...</p>
      </motion.div>
    </AuthLayout>
  );
}