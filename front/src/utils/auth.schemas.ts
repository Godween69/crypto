// front/src/utils/auth.schemas.ts
import { z } from "zod";
import { validateEmailDomain } from "./emailDomainValidator";

// Единые правила для email и пароля, переиспользуются на фронте и бэке
export const emailSchema = z
  .string()
  .min(1, "Email обязателен")
  .max(254, "Email слишком длинный")
  .email("Некорректный формат email")
  .regex(
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    "Email должен содержать @ и домен",
  )
  .refine(
    (email) => {
      const result = validateEmailDomain(email);
      return result.isValid;
    },
    {
      message: "В соответствии с законодательством РФ разрешено использовать только почту российских сервисов (.ru, .рф, mail.ru, yandex.ru и др.)",
    }
  )
  .transform((v) => v.toLowerCase().trim());

// Сильный пароль: минимум 8 символов, буквы в обоих регистрах, цифра, спецсимвол
export const passwordSchema = z
  .string()
  .min(8, "Минимум 8 символов")
  .max(128, "Пароль слишком длинный")
  .regex(/[A-ZА-Я]/, "Нужна хотя бы одна заглавная буква")
  .regex(/[a-zа-я]/, "Нужна хотя бы одна строчная буква")
  .regex(/[0-9]/, "Нужна хотя бы одна цифра")
  .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, "Нужен спецсимвол (!@#$%...)");

export const displayNameSchema = z
  .string()
  .min(2, "Имя слишком короткое")
  .max(50, "Имя слишком длинное")
  .regex(/^[a-zA-Zа-яА-ЯёЁ\s-]+$/, "Только буквы, пробелы и дефис");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Введите пароль"),
  rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z
  .object({
    displayName: displayNameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Подтвердите пароль"),
    rememberMe: z.boolean().optional().default(false),
    termsAccepted: z
      .boolean()
      .refine((v) => v === true, "Необходимо принять условия"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Подтвердите пароль"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;