// front/src/pages/Auth/RegisterPage.tsx

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useAuthStore } from "../../store/authStore";
import { AuthLayout } from "../../components/Auth/AuthLayout";
import { FormField } from "../../components/Auth/FormField";
import { PasswordInput } from "../../components/Auth/PasswordInput";
import { OAuthButtons } from "../../components/Auth/OAuthButtons";
import {
  registerSchema,
  type RegisterFormData,
} from "../../utils/auth.schemas";

// Страница регистрации: имя, email, пароль, подтверждение, условия
export function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);

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

  // useWatch вместо watch — совместимо с React Compiler
  const password = useWatch({ control, name: "password" }) ?? "";
  const confirmPassword = useWatch({ control, name: "confirmPassword" }) ?? "";

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await register(data.email, data.password, data.displayName);
      navigate("/");
    } catch {
      // Ошибка уже обработана в authStore, повторно обрабатывать не нужно
    }
  };

  const handleYandexLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    window.location.href = `${apiUrl}/auth/yandex`;
  };

  return (
    <AuthLayout title="Создать аккаунт" subtitle="Присоединяйся к CryptoFolio">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Display Name */}
        <FormField
          id="displayName"
          label="Имя"
          error={errors.displayName?.message}
        >
          <input
            id="displayName"
            type="text"
            autoComplete="name"
            placeholder="Иван Иванов"
            disabled={isSubmitting}
            {...reg("displayName")}
          />
        </FormField>

        {/* Email */}
        <FormField
          id="email"
          label="Email"
          error={errors.email?.message}
          hint="На этот адрес придёт письмо с подтверждением"
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

        {/* Password */}
        <FormField
          id="password"
          label="Пароль"
          error={errors.password?.message}
        >
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

        {/* Confirm Password */}
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

        {/* Terms */}
        <label className="auth-checkbox">
          <input type="checkbox" {...reg("termsAccepted")} />
          <span>
            Я принимаю{" "}
            <Link to="/terms">условия использования</Link> и{" "}
            <Link to="/privacy">политику конфиденциальности</Link>
          </span>
        </label>

        {errors.termsAccepted && (
          <p
            style={{
              color: "var(--auth-error)",
              fontSize: "0.8rem",
              marginTop: "-0.5rem",
              marginBottom: "1rem",
            }}
          >
            {errors.termsAccepted.message}
          </p>
        )}

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileTap={{ scale: 0.98 }}
          className="auth-submit"
        >
          {isSubmitting ? "Создаём аккаунт..." : "Создать аккаунт"}
        </motion.button>

        {/* OAuth */}
        <OAuthButtons
          onYandexClick={handleYandexLogin}
          disabled={isSubmitting}
        />

        {/* Switch to login */}
        <div className="auth-meta">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </div>
      </form>
    </AuthLayout>
  );
}