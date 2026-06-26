// front/src/pages/Auth/RegisterPage.tsx
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { CheckCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { AuthLayout } from "../../components/Auth/AuthLayout";
import { FormField } from "../../components/Auth/FormField";
import { PasswordInput } from "../../components/Auth/PasswordInput";
import { OAuthButtons } from "../../components/Auth/OAuthButtons";
import { registerSchema, type RegisterFormData } from "../../utils/auth.schemas";
import { useEmailDomainValidation } from "../../hooks/useEmailDomainValidation";
import { getShortValidationMessage } from "../../utils/emailDomainValidator";

// Страница регистрации: форма → успех → ожидание подтверждения почты
export function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const resendVerification = useAuthStore((s) => s.resendVerification);
  const [successMsg, setSuccessMsg] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  const {
    register: reg,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
      rememberMe: true,
      termsAccepted: false,
    },
    mode: "onBlur",
  });

  const email = useWatch({ control, name: "email" }) ?? "";
  const password = useWatch({ control, name: "password" }) ?? "";
  const confirmPassword = useWatch({ control, name: "confirmPassword" }) ?? "";

  // Real-time валидация домена
  const domainValidation = useEmailDomainValidation(email);
  const validationStatus = email && email.includes('@')
    ? (domainValidation.isValid ? 'valid' : 'invalid')
    : null;
  const validationMessage = email && email.includes('@')
    ? getShortValidationMessage(domainValidation)
    : undefined;

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const msg = await register(data.email, data.password, data.displayName);
      setRegisteredEmail(data.email);
      setSuccessMsg(msg);
    } catch {
      // Ошибка уже обработана в authStore
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await resendVerification(registeredEmail);
      alert("Письмо отправлено повторно!");
    } catch {
      alert("Ошибка при повторной отправке. Попробуйте позже.");
    } finally {
      setResendLoading(false);
    }
  };

  // ЭКРАН УСПЕХА
  if (successMsg) {
    return (
      <AuthLayout title="Проверьте почту" subtitle="Мы отправили письмо с подтверждением">
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
          <p style={{ color: "#9ca3af", fontSize: "0.95rem", lineHeight: 1.6, margin: "0 0 1rem" }}>
            Письмо отправлено на <strong style={{ color: "#fff" }}>{registeredEmail}</strong>. <br />
            Перейдите по ссылке в письме, чтобы активировать аккаунт.
          </p>

          <button
            onClick={handleResend}
            disabled={resendLoading}
            style={{
              background: "transparent",
              border: "1px solid var(--auth-accent)",
              color: "var(--auth-accent)",
              padding: "8px 16px",
              borderRadius: 8,
              cursor: resendLoading ? "not-allowed" : "pointer",
              marginTop: "1rem",
              opacity: resendLoading ? 0.6 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {resendLoading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
            {resendLoading ? "Отправляем..." : "Отправить повторно"}
          </button>

          <div className="auth-meta" style={{ marginTop: "1.5rem" }}>
            <Link to="/login">Вернуться ко входу</Link>
          </div>
        </motion.div>
      </AuthLayout>
    );
  }

  // ФОРМА РЕГИСТРАЦИИ
  return (
    <AuthLayout title="Создать аккаунт" subtitle="Присоединяйся к CoinVue">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField id="displayName" label="Имя" error={errors.displayName?.message}>
          <input
            id="displayName"
            type="text"
            autoComplete="name"
            placeholder="Иван Иванов"
            disabled={isSubmitting}
            {...reg("displayName")}
          />
        </FormField>

        <FormField
          id="email"
          label="Email"
          error={errors.email?.message}
          validationStatus={validationStatus}
          validationMessage={validationMessage}
        >
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            disabled={isSubmitting}
            {...reg("email")}
          />
        </FormField>

        <FormField id="password" label="Пароль" error={errors.password?.message}>
          <PasswordInput
            id="password"
            value={password}
            onChange={(v) => setValue("password", v, { shouldValidate: true })}
            autoComplete="new-password"
            placeholder="Придумайте надёжный пароль"
            showStrength
            disabled={isSubmitting}
          />
        </FormField>

        <FormField id="confirmPassword" label="Подтвердите пароль" error={errors.confirmPassword?.message}>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(v) => setValue("confirmPassword", v, { shouldValidate: true })}
            autoComplete="new-password"
            placeholder="Повторите пароль"
            disabled={isSubmitting}
          />
        </FormField>

        <label className="auth-checkbox">
          <input type="checkbox" {...reg("termsAccepted")} />
          <span>
            Я принимаю <Link to="/terms">условия использования</Link> и{" "}
            <Link to="/privacy">политику конфиденциальности</Link>
          </span>
        </label>

        {errors.termsAccepted && (
          <p style={{ color: "var(--auth-error)", fontSize: "0.8rem", marginTop: "-0.5rem", marginBottom: "1rem" }}>
            {errors.termsAccepted.message}
          </p>
        )}

        <motion.button
          type="submit"
          disabled={isSubmitting || (validationStatus === 'invalid')}
          whileTap={{ scale: 0.98 }}
          className="auth-submit"
        >
          {isSubmitting ? "Создаём аккаунт..." : "Создать аккаунт"}
        </motion.button>

        <OAuthButtons
          onYandexClick={() => {
            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
            window.location.href = `${apiUrl}/auth/yandex`;
          }}
          disabled={isSubmitting}
        />

        <div className="auth-meta">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </div>
      </form>
    </AuthLayout>
  );
}