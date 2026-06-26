// front/src/pages/Auth/ForgotPasswordPage.tsx
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { CheckCircle } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { AuthLayout } from "../../components/Auth/AuthLayout";
import { FormField } from "../../components/Auth/FormField";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from "../../utils/auth.schemas";
import { useEmailDomainValidation } from "../../hooks/useEmailDomainValidation";
import { getShortValidationMessage } from "../../utils/emailDomainValidator";

// Страница запроса сброса пароля
export function ForgotPasswordPage() {
  const forgotPassword = useAuthStore((s) => s.forgotPassword);
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });

  const email = useWatch({ control, name: "email" }) ?? "";

  // Real-time валидация домена
  const domainValidation = useEmailDomainValidation(email);
  const validationStatus = email && email.includes("@")
    ? (domainValidation.isValid ? "valid" : "invalid")
    : null;
  const validationMessage = email && email.includes("@")
    ? getShortValidationMessage(domainValidation)
    : undefined;

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await forgotPassword(data.email);
      setSentEmail(data.email);
      setSent(true);
    } catch {
      // Показываем success даже при ошибке (защита от enumeration)
      setSentEmail(data.email);
      setSent(true);
    }
  };

  // Success state
  if (sent) {
    return (
      <AuthLayout title="Письмо отправлено" subtitle="Проверьте вашу почту">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="forgot-success"
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
          <p style={{ color: "#9ca3af", fontSize: "0.95rem", lineHeight: 1.6, margin: "0 0 1rem" }}>
            Если аккаунт с адресом <strong style={{ color: "#fff" }}>{sentEmail}</strong> существует,
            мы отправили на него письмо со ссылкой для сброса пароля.
          </p>

          <p style={{ color: "#6b7280", fontSize: "0.85rem", lineHeight: 1.6, margin: "0 0 2rem" }}>
            Ссылка действительна в течение 1 часа. Проверьте папку «Спам», если письмо не пришло.
          </p>

          <div className="auth-meta">
            <Link to="/login">Вернуться ко входу</Link>
          </div>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Забыли пароль?"
      subtitle="Введите email, и мы пришлём ссылку для сброса"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField
          id="email"
          label="Email"
          error={errors.email?.message}
          hint="На этот адрес придёт ссылка для сброса пароля"
          validationStatus={validationStatus}
          validationMessage={validationMessage}
        >
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            disabled={isSubmitting}
            {...register("email")}
          />
        </FormField>

        <motion.button
          type="submit"
          disabled={isSubmitting || (validationStatus === "invalid")}
          whileTap={{ scale: 0.98 }}
          className="auth-submit"
        >
          {isSubmitting ? "Отправляем..." : "Отправить ссылку"}
        </motion.button>

        <div className="auth-meta" style={{ marginTop: "1.5rem" }}>
          Вспомнили пароль? <Link to="/login">Войти</Link>
        </div>
      </form>
    </AuthLayout>
  );
}