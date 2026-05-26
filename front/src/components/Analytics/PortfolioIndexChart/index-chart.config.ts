export type RangeKey = "1d" | "7d" | "30d" | "90d" | "1y" | "all";
export type YAxisMode = "index" | "usd";
export type ChartType = "line" | "area";
export type EasingType = "linear" | "quadraticOut" | "cubicOut" | "quarticOut";

export const INDEX_CHART_CONFIG = {
  ranges: [
    { key: "1d", label: "24ч" },
    { key: "7d", label: "7д" },
    { key: "30d", label: "30д" },
    { key: "90d", label: "90д" },
    { key: "1y", label: "1г" },
    { key: "all", label: "Всё" },
  ] as const,
  defaultRange: "1d" as RangeKey,
  yAxisMode: "usd" as YAxisMode,

  chart: {
    type: "area" as ChartType,
    lineColor: "#3b82f6",
    areaColor: ["rgba(59, 130, 246, 0.25)", "rgba(59, 130, 246, 0.02)"] as [
      string,
      string,
    ],
    lineWidth: 2,
    smooth: true,
    symbol: "none" as "none" | "circle",
  },

  grid: { top: 20, right: 20, bottom: 40, left: 0, containLabel: true },

  xAxis: {
    show: true,
    type: "time" as const,
    axisLine: { show: true, lineStyle: { color: "#334155" } },
    axisTick: {
      show: true,
      alignWithLabel: false,
      lineStyle: { color: "#475569" },
    },
    splitLine: { show: false },
    axisLabel: {
      color: "#94a3b8",
      fontSize: 11,
      hideOverlap: true,
      // адаптивный формат: 1-е число → "MMM YYYY", остальные → "DD MMM"
      formatter: (value: number) => {
        const d = new Date(value);
        const day = d.getDate();
        const month = d.toLocaleString("ru-RU", { month: "short" });
        const year = d.getFullYear();
        return day === 1
          ? `${month} ${year}`
          : `${day.toString().padStart(2, "0")} ${month}`;
      },
    },
  },

  yAxis: {
    show: true,
    type: "log" as const, // логарифмическая шкала для корректного отображения относительной динамики
    logBase: 10,
    axisLine: { show: false },
    axisTick: { show: true },
    splitLine: { lineStyle: { type: "dashed" as const, color: "#334155" } },
    axisLabel: {
      color: "#94a3b8",
      fontSize: 11,
      // форматтер работает с исходными значениями, логарифм влияет только на визуальную проекцию оси
      formatter: (value: number) => {
        if (value >= 10000) return `$${Math.round(value / 1000)}K`;
        return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
      },
    },
  },

  tooltip: {
    show: true,
    trigger: "axis" as const,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderColor: "#334155",
    borderWidth: 1,
    textStyle: { color: "#f1f5f9", fontSize: 12 },
    padding: [10, 12] as [number, number],
  },

  animation: {
    enabled: true,
    duration: 600,
    easing: "cubicOut" as EasingType,
  },

  states: {
    loading: "Загрузка индекса...",
    empty: "Недостаточно данных для построения",
    error: "Ошибка загрузки графика",
  },
} as const;
