// front/src/components/Analytics/PortfolioDistributionChart/chart.config.ts

export const CHART_CONFIG = {
  // 📊 Агрегация: топ-N + группировка остальных
  aggregation: {
    maxVisibleItems: 6, // Варианты: любое число > 0 (сколько секторов показывать отдельно)
    othersLabel: "Остальные", // Варианты: любая строка (подпись для сгруппированной доли)
  },

  // 🎨 Палитра секторов (применяется циклически)
  colors: [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#f97316",
  ],

  // 📐 Геометрия кольца и смещение центра
  radius: { inner: "50%", outer: "90%" }, // Варианты: '0%'-'100%' или число в px
  center: { x: "33%", y: "50%" }, // Варианты: '0%'-'100%' или число в px (смещение для места под легенду)

  // 📜 Легенда
  legend: {
    show: true, // Варианты: true | false
    orient: "vertical" as "horizontal" | "vertical", // Варианты: 'horizontal' | 'vertical'
    position: "right" as "left" | "right" | "top" | "bottom", // Варианты: 'left' | 'right' | 'top' | 'bottom'
    align: "auto" as "left" | "right" | "auto", // Варианты: 'left' | 'right' | 'auto'
    showPercent: true, // Варианты: true | false (показывать % рядом с названием)
    itemGap: 13, // Варианты: число (отступ между элементами)
    itemWidth: 17, // Варианты: число (ширина маркера)
    itemHeight: 13, // Варианты: число (высота маркера)
    textStyle: { fontSize: 13, color: "#cbd5e1", fontWeight: 500 },
    padding: [0, 0, 20, 20] as [number, number, number, number], // [top, right, bottom, left]
  },

  // 🖼️ Оформление секторов (тени, границы, скругления)
  itemStyle: {
    borderRadius: 5, // Варианты: число (скругление краёв)
    borderColor: "#0f172a", // Варианты: любой CSS-цвет
    borderWidth: 0, // Варианты: число (толщина разделителя)
    shadowBlur: 13, // Варианты: число (радиус тени)
    shadowColor: "rgba(0, 0, 0, 0.65)", // Варианты: любой CSS-цвет
    shadowOffsetX: 0, // Варианты: число (смещение тени по X)
    shadowOffsetY: 4, // Варианты: число (смещение тени по Y)
  },

  // 🏷️ Подписи на секторах
  label: {
    show: false, // Варианты: true | false
    position: "outside" as "inside" | "outside" | "center", // Варианты: 'inside' | 'outside' | 'center'
    formatter: "{b}: {d}%", // Варианты: строка с шаблоном ({b}=имя, {c}=значение, {d}=%)
    fontSize: 11,
    color: "#e2e8f0",
    fontWeight: 600,
  },

  // 🎯 Указатели осей (линии/перекрестия при наведении)
  axisPointer: { type: "none" as "none" | "line" | "shadow" | "cross" }, // Варианты: 'none' (откл) | 'line' | 'shadow' | 'cross'

  // 💡 Тултип (всплывающая подсказка)
  tooltip: {
    show: true, // Варианты: true | false
    trigger: "item" as "item" | "axis", // Варианты: 'item' (по сектору) | 'axis' (по оси)
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    borderColor: "#334155",
    borderWidth: 1,
    textStyle: { color: "#f1f5f9", fontSize: 12, fontWeight: 500 },
    formatter: "{b}: ${c} ({d}%)",
    padding: [10, 14] as [number, number],
  },

  // 🎬 Анимация и Hover-эффекты
  animation: {
    enabled: true, // Варианты: true | false (глобально вкл/выкл анимацию)
    duration: 700, // Варианты: число > 0 (длительность перехода в мс)
    easing: "cubicOut" as
      | "linear"
      | "quadraticOut"
      | "cubicOut"
      | "quarticOut"
      | "elasticOut", // Варианты: кривые плавности
  },
  hover: {
    enabled: true, // Варианты: true | false (реакция на наведение)
    scale: true, // Варианты: true (увеличение сектора) | false (без увеличения)
    opacity: 0.85, // Варианты: 0.0 - 1.0 (прозрачность при наведении)
  },

  // 📝 Тексты состояний
  states: {
    loading: "Загрузка данных...",
    empty: "Нет активов для отображения",
    error: "Ошибка загрузки данных",
  },
} as const;
