// front/src/pages/Auth/LoginPage.tsx
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useAuthStore } from "../../store/authStore";
import { AuthLayout } from "../../components/Auth/AuthLayout";
import { FormField } from "../../components/Auth/FormField";
import { PasswordInput } from "../../components/Auth/PasswordInput";
import { OAuthButtons } from "../../components/Auth/OAuthButtons";
import { loginSchema, type LoginFormData } from "../../utils/auth.schemas";
import { useEmailDomainValidation } from "../../hooks/useEmailDomainValidation";
import { getShortValidationMessage } from "../../utils/emailDomainValidator";

// Страница входа: email + password + remember me + OAuth
export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
    mode: "onBlur",
  });

  // useWatch вместо watch — совместимо с React Compiler
  const email = useWatch({ control, name: "email" }) ?? "";
  const password = useWatch({ control, name: "password" }) ?? "";

  // Real-time валидация домена
  const domainValidation = useEmailDomainValidation(email);
  const validationStatus = email && email.includes("@")
    ? (domainValidation.isValid ? "valid" : "invalid")
    : null;
  const validationMessage = email && email.includes("@")
    ? getShortValidationMessage(domainValidation)
    : undefined;

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password, data.rememberMe);
      navigate("/");
    } catch {
      // Ошибка уже залогирована в authStore, повторно обрабатывать не нужно
    }
  };

  const handleYandexLogin = () => {
    // Редирект на бэкенд для OAuth
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    window.location.href = `${apiUrl}/auth/yandex`;
  };

  return (
    <AuthLayout title="С возвращением" subtitle="Войдите в свой аккаунт">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Email */}
        <FormField
          id="email"
          label="Email"
          error={errors.email?.message}
          hint="Мы никогда не передадим ваш email третьим лицам"
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
            autoComplete="current-password"
            placeholder="Введите пароль"
            disabled={isSubmitting}
          />
        </FormField>

        {/* Forgot link */}
        <div className="auth-meta__forgot">
          <Link to="/forgot-password">Забыли пароль?</Link>
        </div>

        {/* Remember me */}
        <label className="auth-checkbox">
          <input type="checkbox" {...register("rememberMe")} />
          <span>Запомнить меня на этом устройстве</span>
        </label>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={isSubmitting || (validationStatus === "invalid")}
          whileTap={{ scale: 0.98 }}
          className="auth-submit"
        >
          {isSubmitting ? "Входим..." : "Войти"}
        </motion.button>

        {/* OAuth */}
        <OAuthButtons
          onYandexClick={handleYandexLogin}
          disabled={isSubmitting}
        />

        {/* Switch to register */}
        <div className="auth-meta">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </div>
      </form>
    </AuthLayout>
  );
}