// front/src/components/Auth/OAuthButtons.tsx

import { motion } from "motion/react";

// Заглушка иконки Яндекса (в реальности — SVG из брендбука)
const YandexIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.324 24h-3.536V13.334L5.96 1.216h3.748l2.084 8.676 2.084-8.676h3.748l-4.3 12.118V24z" />
  </svg>
);

interface OAuthButtonsProps {
  onYandexClick: () => void;
  disabled?: boolean;
}

// Блок OAuth провайдеров. Пока только Яндекс, но легко расширить
export const OAuthButtons = ({
  onYandexClick,
  disabled = false,
}: OAuthButtonsProps) => {
  return (
    <div className="oauth-buttons">
      <div className="oauth-buttons__divider">
        <span>или</span>
      </div>

      <motion.button
        type="button"
        onClick={onYandexClick}
        disabled={disabled}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="oauth-buttons__btn oauth-buttons__btn--yandex"
      >
        <YandexIcon />
        <span>Войти через Яндекс ID</span>
      </motion.button>
    </div>
  );
};