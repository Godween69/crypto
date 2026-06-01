// front/src/components/Auth/AuthHero.tsx

import { motion } from "motion/react";
import { Shield, Lock, TrendingUp } from "lucide-react";

// Правая декоративная часть AuthLayout — брендинг и преимущества
export const AuthHero = () => {
  const features = [
    { icon: Shield, title: "Безопасность", text: "AES-256 и httpOnly cookies" },
    { icon: Lock, title: "Приватность", text: "Данные не покидают сервер" },
    { icon: TrendingUp, title: "Аналитика", text: "Портфель в реальном времени" },
  ];

  return (
    <div className="auth-hero">
      {/* Анимированный градиентный фон */}
      <div className="auth-hero__bg" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="auth-hero__content"
      >
        <div className="auth-hero__logo">
          <div className="auth-hero__logo-mark">₿</div>
          <span className="auth-hero__logo-text">CoinVue</span>
        </div>

        <h1 className="auth-hero__title">
          Управляй криптой
          <br />
          <span className="auth-hero__title-accent">как профи</span>
        </h1>

        <p className="auth-hero__subtitle">
          Профессиональная аналитика портфеля, автоматические снапшоты и
          институциональная безопасность.
        </p>

        <ul className="auth-hero__features">
          {features.map((f, i) => (
            <motion.li
              key={f.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="auth-hero__feature"
            >
              <div className="auth-hero__feature-icon">
                <f.icon size={20} />
              </div>
              <div>
                <div className="auth-hero__feature-title">{f.title}</div>
                <div className="auth-hero__feature-text">{f.text}</div>
              </div>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
};