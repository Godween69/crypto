// front/src/components/Auth/PasswordInput.tsx

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import { usePasswordStrength } from "../../hooks/usePasswordStrength";

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  autoComplete?: string;
  showStrength?: boolean; // показывать ли индикатор силы
  disabled?: boolean;
}

// Поле пароля с переключением видимости и индикатором силы
export const PasswordInput = ({
  id,
  value,
  onChange,
  onBlur,
  placeholder = "Введите пароль",
  autoComplete = "current-password",
  showStrength = false,
  disabled = false,
}: PasswordInputProps) => {
  const [visible, setVisible] = useState(false);
  const strength = usePasswordStrength(value);

  return (
    <div className="password-input">
      <div className="password-input__wrapper">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className="password-input__field"
        />

        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="password-input__toggle"
          aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
          tabIndex={-1}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {/* Индикатор силы пароля */}
      {showStrength && value.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="password-input__strength"
        >
          {/* Полоска силы: 4 сегмента */}
          <div className="password-input__bars">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="password-input__bar"
                animate={{
                  backgroundColor:
                    i <= strength.score - 1 ? strength.color : "#3f3f46",
                }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>

          <div className="password-input__meta">
            <span
              className="password-input__label"
              style={{ color: strength.color }}
            >
              {strength.label}
            </span>
            <span className="password-input__crack">
              взлом: {strength.crackTime}
            </span>
          </div>

          {/* Подсказки от zxcvbn */}
          {strength.suggestions.length > 0 && (
            <ul className="password-input__tips">
              {strength.suggestions.slice(0, 2).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </motion.div>
      )}
    </div>
  );
};