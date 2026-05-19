// front/src/utils/formatCoinName.ts

/**
 * Форматирует название монеты для отображения в UI.
 * - Если есть name → возвращает его
 * - Если есть coinId → преобразует: "chainlink" → "Chainlink", "shiba-inu" → "Shiba Inu"
 * - Фоллбэк на symbol
 */
export const formatCoinName = (
  name?: string,
  coinId?: string,
  symbol?: string,
): string => {
  if (name) return name;
  if (coinId) {
    return coinId
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return symbol ?? "";
};