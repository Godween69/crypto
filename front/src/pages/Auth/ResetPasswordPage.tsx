// front/src/pages/Auth/ResetPasswordPage.tsx

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { AuthLayout } from "../../components/Auth/AuthLayout";
import { FormField } from "../../components/Auth/FormField";
import { PasswordInput } from "../../components/Auth/PasswordInput";
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from "../../utils/auth.schemas";

// Страница установки нового пароля по токену из URL
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const resetPassword = useAuthStore((s) => s.resetPassword);

  const token = searchParams.get("token") ?? "";
  const [success, setSuccess] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const {
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onBlur",
  });

  const password = useWatch({ control, name: "password" }) ?? "";
  const confirmPassword = useWatch({ control, name: "confirmPassword" }) ?? "";

  // Если токена нет в URL — показываем ошибку
  if (!token) {
    return (
      <AuthLayout title="Неверная ссылка" subtitle="Токен сброса отсутствует">
        <div style={{ textAlign: "center", padding: "2rem 0" }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 1.5rem",
              background: "rgba(239, 68, 68, 0.1)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ef4444",
            }}
          >
            <AlertCircle size={32} />
          </div>
          <p style={{ color: "#9ca3af", fontSize: "0.95rem", margin: "0 0 1.5rem" }}>
            Ссылка для сброса пароля некорректна или истекла.
          </p>
          <div className="auth-meta">
            <Link to="/forgot-password">Запросить новую ссылку</Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    setGlobalError("");
    try {
      await resetPassword(token, data.password);
      setSuccess(true);
      // Через 3 секунды редиректим на логин
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setGlobalError(err.message);
      } else {
        setGlobalError("Произошла ошибка при сбросе пароля");
      }
    }
  };

  if (success) {
    return (
      <AuthLayout title="Пароль изменён" subtitle="Можете войти с новым паролем">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: "center", padding: "2rem 0" }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 1.5rem",
              background: "rgba(34, 197, 94, 0.1)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#22c55e",
            }}
          >
            <CheckCircle size={32} />
          </div>
          <p style={{ color: "#9ca3af", fontSize: "0.95rem", margin: "0 0 1.5rem" }}>
            Ваш пароль успешно изменён. Перенаправляем на страницу входа...
          </p>
          <div className="auth-meta">
            <Link to="/login">Войти сейчас</Link>
          </div>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Новый пароль" subtitle="Придумайте надёжный пароль">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {globalError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: "0.75rem 1rem",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: 8,
              color: "#ef4444",
              fontSize: "0.875rem",
              marginBottom: "1.25rem",
            }}
          >
            {globalError}
          </motion.div>
        )}

        <FormField
          id="password"
          label="Новый пароль"
          error={errors.password?.message}
        >
          <PasswordInput
            id="password"
            value={password}
            onChange={(v) => setValue("password", v, { shouldValidate: true })}
            autoComplete="new-password"
            placeholder="Минимум 8 символов"
            showStrength
            disabled={isSubmitting}
          />
        </FormField>

        <FormField
          id="confirmPassword"
          label="Подтвердите пароль"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(v) =>
              setValue("confirmPassword", v, { shouldValidate: true })
            }
            autoComplete="new-password"
            placeholder="Повторите пароль"
            disabled={isSubmitting}
          />
        </FormField>

        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileTap={{ scale: 0.98 }}
          className="auth-submit"
        >
          {isSubmitting ? "Сохраняем..." : "Сменить пароль"}
        </motion.button>

        <div className="auth-meta" style={{ marginTop: "1.5rem" }}>
          <Link to="/login">Вернуться ко входу</Link>
        </div>
      </form>
    </AuthLayout>
  );
}