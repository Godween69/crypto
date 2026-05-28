// front/src/pages/Auth/VerifyEmailPage.tsx

import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { AuthLayout } from "../../components/Auth/AuthLayout";

export function VerifyEmailPage() {
  // Хуки вызываются строго на верхнем уровне
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const verifyEmail = useAuthStore((s) => s.verifyEmail);
  const token = searchParams.get("token") ?? "";

  // Инициализация стейта на основе наличия токена
  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [errorMsg, setErrorMsg] = useState(token ? "" : "Токен подтверждения отсутствует в ссылке.");

  useEffect(() => {
    if (!token) return;

    // Локальный флаг отмены: корректно работает с React StrictMode
    let cancelled = false;
    console.log("[VerifyEmail] Запуск эффекта верификации");

    verifyEmail(token)
      .then(() => {
        console.log("[VerifyEmail] Промис разрешён успешно");
        if (!cancelled) {
          setStatus("success");
          // Редирект в приложение после успеха
          setTimeout(() => navigate("/"), 2000);
        }
      })
      .catch((err) => {
        console.log("[VerifyEmail] Промис отклонён:", err);
        if (!cancelled) {
          setStatus("error");
          setErrorMsg(err instanceof Error ? err.message : "Ошибка подтверждения");
        }
      });

    // Cleanup вызывается при размонтировании (в т.ч. при StrictMode-перезапуске)
    return () => {
      cancelled = true;
      console.log("[VerifyEmail] Эффект очищен, запрос игнорируется");
    };
  }, [token, verifyEmail, navigate]);

  // Рендер ошибки (нет токена или верификация не удалась)
  if (!token || status === "error") {
    return (
      <AuthLayout title="Подтверждение email">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", padding: "2rem 0" }}>
          <AlertCircle size={48} style={{ margin: "0 auto 1rem", color: "#ef4444" }} />
          <h3 style={{ margin: "0 0 0.5rem", color: "#fff" }}>Ошибка подтверждения</h3>
          <p style={{ color: "#9ca3af", marginBottom: "1.5rem" }}>{errorMsg}</p>
          <div className="auth-meta">
            <Link to="/login">Вернуться ко входу</Link>
          </div>
        </motion.div>
      </AuthLayout>
    );
  }

  // Рендер загрузки
  if (status === "loading") {
    return (
      <AuthLayout title="Подтверждение email">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", padding: "2rem 0" }}>
          <Loader2 size={40} style={{ animation: "spin 1s linear infinite", margin: "0 auto 1rem", color: "var(--auth-accent)" }} />
          <p style={{ color: "#9ca3af" }}>Подтверждаем ваш email...</p>
        </motion.div>
      </AuthLayout>
    );
  }

  // Рендер успеха
  return (
    <AuthLayout title="Подтверждение email">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", padding: "2rem 0" }}>
        <CheckCircle size={48} style={{ margin: "0 auto 1rem", color: "#22c55e" }} />
        <h3 style={{ margin: "0 0 0.5rem", color: "#fff" }}>Email подтверждён!</h3>
        <p style={{ color: "#9ca3af" }}>Перенаправляем в приложение...</p>
      </motion.div>
    </AuthLayout>
  );
}