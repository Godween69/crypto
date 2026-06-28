// ─────────────────────────────────────────────────────────────────────────────
// index-chart.config.ts
// Все визуальные и поведенческие параметры графика в одном месте.
// Компонент читает этот файл — менять логику не нужно, только значения здесь.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Типы (не менять) ────────────────────────────────────────────────────────
export type RangeKey = "1d" | "7d" | "30d" | "90d" | "1y" | "all";

// "index"  — нормализованный индекс (первая точка = 100, остальные относительно)
// "usd"    — абсолютная стоимость портфеля в долларах
export type YAxisMode = "index" | "usd";

// "line"   — простая линия
// "area"   — линия с заливкой под ней (как CoinGecko)
export type ChartType = "line" | "area";

// Кривая анимации перехода
// "linear"       — равномерная
// "quadraticOut" — лёгкое торможение в конце
// "cubicOut"     — среднее торможение (рекомендуется)
// "quarticOut"   — сильное торможение, плавный финиш
export type EasingType = "linear" | "quadraticOut" | "cubicOut" | "quarticOut";
// ─────────────────────────────────────────────────────────────────────────────

export const INDEX_CHART_CONFIG = {

  // ─── Таймфреймы ────────────────────────────────────────────────────────────
  // Порядок определяет порядок кнопок под графиком.
  // key  — передаётся в API (?range=1d), label — текст кнопки.
  ranges: [
    { key: "1d", label: "24ч" },
    { key: "7d", label: "7д" },
    { key: "30d", label: "30д" },
    { key: "90d", label: "90д" },
    { key: "1y", label: "1г" },
    { key: "all", label: "Всё" },
  ] as const,

  // Какой таймфрейм выбран при первом открытии
  defaultRange: "1d" as RangeKey,

  // Режим оси Y: "usd" (рекомендуется для трекера) или "index"
  yAxisMode: "usd" as YAxisMode,

  // ─── Цвета направления ────────────────────────────────────────────────────
  // Линия и заливка меняют цвет в зависимости от того, вырос портфель или упал.
  colors: {
    // Портфель вырос (последняя точка > первой)
    up: {
      line: "#22c55e",                                     // зелёная линия
      areaTop: "rgba(34, 197, 94, 0.20)",                     // заливка сверху
      areaBottom: "rgba(34, 197, 94, 0.01)",                     // заливка снизу
      delta: "#22c55e",                                     // цвет дельты в заголовке
    },
    // Портфель упал (последняя точка < первой)
    down: {
      line: "#ef4444",
      areaTop: "rgba(239, 68, 68, 0.20)",
      areaBottom: "rgba(239, 68, 68, 0.01)",
      delta: "#ef4444",
    },
    // Нет изменений
    neutral: {
      line: "#3b82f6",
      areaTop: "rgba(59, 130, 246, 0.20)",
      areaBottom: "rgba(59, 130, 246, 0.01)",
      delta: "#94a3b8",
    },
  },

  // ─── Внешний вид графика ───────────────────────────────────────────────────
  chart: {
    // Тип: "area" — с заливкой (как CoinGecko), "line" — без
    type: "area" as ChartType,

    // Толщина линии в пикселях
    lineWidth: 2,

    // true  — сглаженная кривая (Безье, как на биржевых графиках)
    // false — ломаная линия по точкам
    smooth: true,

    // "none"   — без точек на линии (чище смотрится)
    // "circle" — кружок на каждой точке данных
    symbol: "none" as "none" | "circle",
  },

  // ─── Отступы холста ────────────────────────────────────────────────────────
  // containLabel: true — left/right учитывают ширину подписей осей автоматически
  grid: {
    top: 16,
    right: 16,
    bottom: 36,
    left: -40,
    containLabel: true,
  },

  // ─── Ось X (время) ─────────────────────────────────────────────────────────
  xAxis: {
    show: true,
    type: "time" as const,

    axisLine: {
      show: true,
      lineStyle: { color: "#1e293b" },
    },
    axisTick: {
      show: true,
      alignWithLabel: false,
      lineStyle: { color: "#334155" },
    },
    splitLine: { show: false },
    axisLabel: {
      color: "#475569",
      fontSize: 11,
      hideOverlap: true,
      // 1-е число месяца → "янв 2025", иначе → "15 янв"
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

  // ─── Ось Y (стоимость) ─────────────────────────────────────────────────────
  yAxis: {
    show: false, // скрываем ось — цена отображается в тултипе и заголовке (чище)

    type: "value" as const,

    // Отступ 3% снизу и 2% сверху — линия не прижата к краям
    // Используется в компоненте как: min = dataMin * Y_PADDING.bottom
    yPaddingBottom: 0.9,
    yPaddingTop: 1.02,

    splitLine: {
      show: true,
      lineStyle: { type: "dashed" as const, color: "#1e293b" },
    },
  },

  // ─── Crosshair и axisPointer ───────────────────────────────────────────────
  axisPointer: {
    // Тонкая вертикальная линия вместо стандартной полосы
    lineStyle: {
      color: "#475569",
      width: 1,
      type: "solid" as const,
    },
    // Кружок на линии в точке данных
    handle: { show: false },
  },

  // ─── Тултип при наведении ──────────────────────────────────────────────────
  tooltip: {
    show: true,
    trigger: "axis" as const,
    backgroundColor: "rgba(15, 23, 42, 0.53)",
    borderColor: "#33415598",
    borderWidth: 1,
    textStyle: { color: "#f1f5f9", fontSize: 12 },
    padding: [10, 14] as [number, number],
  },

  // ─── endLabel — метка последнего значения на правом краю линии ────────────
  endLabel: {
    show: false,
    fontSize: 1,
    padding: [6, 6] as [number, number],
    // Цвет фона подбирается динамически в компоненте по направлению
  },

  // ─── Пунктирная горизонталь от последней точки ────────────────────────────
  lastValueLine: {
    show: true,
    lineStyle: {
      type: "dashed" as const,
      width: 0.7,
      // Цвет подбирается динамически в компоненте
    },
  },

  // ─── Анимация ──────────────────────────────────────────────────────────────
  animation: {
    enabled: true,
    // Длительность в миллисекундах
    duration: 500,
    // Кривая плавности (см. тип EasingType выше)
    easing: "cubicOut" as EasingType,
  },

  // ─── Skeleton при загрузке ─────────────────────────────────────────────────
  skeleton: {
    // Количество "костей" в skeleton-баре
    bars: 12,
    // Высота каждой кости в % от высоты viewport
    // Задаётся случайно в диапазоне [min, max] при каждом рендере
    heightMin: 20,
    heightMax: 80,
  },

  // ─── Тексты состояний ──────────────────────────────────────────────────────
  states: {
    loading: "",          // загрузка: показывается skeleton, текст не нужен
    empty: "Добавьте активы, чтобы увидеть динамику портфеля",
    error: "Не удалось загрузить график — попробуйте позже",
  },

} as const;