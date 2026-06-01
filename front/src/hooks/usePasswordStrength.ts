// front/src/hooks/usePasswordStrength.ts

import { useMemo } from "react";
import zxcvbn from "zxcvbn";

export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  score: StrengthLevel; // 0-4
  label: string;
  color: string;
  warnings: string[];
  suggestions: string[];
  crackTime: string; // гарантированно строка
}

const LABELS: Record<StrengthLevel, string> = {
  0: "Очень слабый",
  1: "Слабый",
  2: "Средний",
  3: "Хороший",
  4: "Отличный",
};

const COLORS: Record<StrengthLevel, string> = {
  0: "#ef4444", // красный
  1: "#f97316", // оранжевый
  2: "#eab308", // жёлтый
  3: "#84cc16", // салатовый
  4: "#22c55e", // зелёный
};

// Хук использует zxcvbn для реальной оценки взломостойкости
export const usePasswordStrength = (password: string): PasswordStrength => {
  return useMemo(() => {
    if (!password) {
      return {
        score: 0,
        label: "",
        color: "#3f3f46",
        warnings: [],
        suggestions: [],
        crackTime: "",
      };
    }

    const result = zxcvbn(password);
    const score = result.score as StrengthLevel;

    // crack_times_display может возвращать string | number — приводим к string
    const rawCrackTime =
      result.crack_times_display.offline_slow_hashing_1e4_per_second;
    const crackTime = String(rawCrackTime);

    return {
      score,
      label: LABELS[score],
      color: COLORS[score],
      // Локализуем предупреждения
      warnings: result.feedback.warning
        ? [translateWarning(result.feedback.warning)]
        : [],
      suggestions: result.feedback.suggestions.map(translateSuggestion),
      crackTime,
    };
  }, [password]);
};

// Простой перевод типичных сообщений zxcvbn
function translateWarning(w: string): string {
  const map: Record<string, string> = {
    "Straight rows of keys are easy to guess":
      "Последовательности клавиш легко угадать",
    "Short keyboard patterns are easy to guess":
      "Короткие паттерны на клавиатуре легко угадать",
    'Repeats like "aaa" are easy to guess': "Повторы легко угадать",
    "Sequences like abc or 6543 are easy to guess":
      "Последовательности легко угадать",
    "Recent years are easy to guess": "Недавние годы легко угадать",
    "Dates are often easy to guess": "Даты часто легко угадать",
    "This is a top-10 common password": "Это пароль из топ-10 популярных",
    "This is a top-100 common password": "Это пароль из топ-100 популярных",
    "This is a very common password": "Это очень распространённый пароль",
    "A word by itself is easy to guess": "Одно слово легко угадать",
  };
  return map[w] ?? w;
}

function translateSuggestion(s: string): string {
  const map: Record<string, string> = {
    "Use a few words, avoid common phrases":
      "Используйте несколько слов, избегайте общих фраз",
    "No need for symbols, digits, or uppercase letters":
      "Символы, цифры и заглавные не обязательны",
    "Add another word or two": "Добавьте ещё слово-другое",
    "Capitalization doesn't help very much":
      "Заглавные буквы почти не помогают",
    "All-uppercase is almost as easy to guess as all-lowercase":
      "Все заглавные почти так же легко угадать, как все строчные",
    "Avoid repeated words and characters":
      "Избегайте повторяющихся слов и символов",
    "Avoid sequences": "Избегайте последовательностей",
    "Avoid recent years": "Избегайте недавних годов",
    "Avoid years that are associated with you":
      "Избегайте годов, связанных с вами",
    "Avoid dates and years that are associated with you":
      "Избегайте дат и годов, связанных с вами",
    "Predictable substitutions like '@' instead of 'a' don't help very much":
      "Предсказуемые замены вроде '@' вместо 'a' не сильно помогают",
    "Add another word or two. Uncommon words are better.":
      "Добавьте ещё слово-другое. Редкие слова лучше.",
    "Use a longer keyboard pattern with more turns":
      "Используйте более длинный паттерн клавиатуры с поворотами",
    "Try to avoid predictable substitutions":
      "Старайтесь избегать предсказуемых замен",
  };

  // Если есть точное совпадение — возвращаем перевод
  if (map[s]) return map[s];

  // Если строка содержит ключевую фразу — пытаемся найти частичное совпадение
  for (const [key, value] of Object.entries(map)) {
    if (s.includes(key)) return value;
  }

  // Фоллбэк: если не нашли — возвращаем оригинал, но логируем для доработки
  console.warn(`[PasswordStrength] Не переведена подсказка: "${s}"`);
  return s;
}
