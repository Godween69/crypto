// front/src/components/Analytics/PortfolioIndexChart/PortfolioIndexChart.tsx
import { useEffect, useRef, useMemo, useState } from 'react';
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';
import * as echarts from 'echarts';
import type { EChartsOption, TooltipComponentOption } from 'echarts';
import { INDEX_CHART_CONFIG } from './index-chart.config';
import type { RangeKey } from './index-chart.config';
import { api } from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';
import './PortfolioIndexChart.css';

// ─── Типы ────────────────────────────────────────────────────────────────────
type IndexPoint = { timestamp: string; value: number };

type Direction = 'up' | 'down' | 'neutral';

// ─── Форматирование USD ───────────────────────────────────────────────────────
const formatUsd = (val: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

// ─── Форматирование дельты: +$1,240 (↑ 4.2%) ─────────────────────────────────
const formatDelta = (first: number, last: number) => {
  const abs = last - first;
  const pct = first !== 0 ? (abs / first) * 100 : 0;
  const sign = abs >= 0 ? '+' : '';
  const arrow = abs > 0 ? '↑' : abs < 0 ? '↓' : '—';
  return {
    text: `${sign}${formatUsd(abs)} (${arrow} ${Math.abs(pct).toFixed(2)}%)`,
    direction: abs > 0 ? 'up' : abs < 0 ? 'down' : 'neutral' as Direction,
  };
};

// ─── Skeleton-полосы при загрузке ────────────────────────────────────────────
const SkeletonChart = () => {
  const cfg = INDEX_CHART_CONFIG.skeleton;
  // Генерируем высоты один раз (при монтировании), не при каждом рендере
  const bars = useMemo(() =>
    Array.from({ length: cfg.bars }, () =>
      cfg.heightMin + Math.random() * (cfg.heightMax - cfg.heightMin)
    ), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="index-chart-skeleton">
      {bars.map((h, i) => (
        <div
          key={i}
          className="index-chart-skeleton-bar"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
export const PortfolioIndexChart = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  // Значение, которое показывается в заголовке.
  // При hover — цена под курсором, иначе — последняя точка.
  const [headerValue, setHeaderValue] = useState<number | null>(null);
  const [range, setRange] = useState<RangeKey>(INDEX_CHART_CONFIG.defaultRange);
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);

  // ─── Запрос данных ─────────────────────────────────────────────────────────
  const { data, isLoading, isFetching, isError } = useQuery<IndexPoint[]>({
    queryKey: ['portfolio-index', userId, range],
    queryFn: async () => {
      const res = await api.get(`/analytics/portfolio-index?range=${range}`);
      return res.data as IndexPoint[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    enabled: !!userId,
  });

  // ─── Инвалидация кэша после транзакции ────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-index', userId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio', userId] });
    };
    window.addEventListener('portfolio:transaction:success', handler);
    return () => window.removeEventListener('portfolio:transaction:success', handler);
  }, [queryClient, userId]);

  // ─── Трансформация данных → [timestamp_ms, value] ─────────────────────────
  const chartSeries = useMemo((): [number, number][] => {
    if (!data || data.length === 0) return [];
    if (INDEX_CHART_CONFIG.yAxisMode === 'usd') {
      return data.map((p) => [new Date(p.timestamp).getTime(), p.value]);
    }
    const first = data[0].value;
    if (first === 0) return [];
    return data.map((p) => [new Date(p.timestamp).getTime(), (p.value / first) * 100]);
  }, [data]);

  // ─── Последнее значение ────────────────────────────────────────────────────
  const lastValue = useMemo(() => {
    if (!data || data.length === 0) return null;
    return data[data.length - 1].value;
  }, [data]);

  // ─── Первое значение (для расчёта дельты) ─────────────────────────────────
  const firstValue = useMemo(() => {
    if (!data || data.length === 0) return null;
    return data[0].value;
  }, [data]);

  // Дельта за выбранный период
  const delta = useMemo(() => {
    if (firstValue === null || lastValue === null) return null;
    return formatDelta(firstValue, lastValue);
  }, [firstValue, lastValue]);

  // Направление (для динамического цвета)
  const direction: Direction = delta?.direction ?? 'neutral';
  const colorSet = INDEX_CHART_CONFIG.colors[direction];

  // Синхронизируем headerValue с последней точкой при смене данных
  useEffect(() => {
    setHeaderValue(lastValue);
  }, [lastValue]);

  // ─── Инициализация и обновление ECharts ───────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (container.clientWidth === 0 || container.clientHeight === 0) return;

    if (!chartRef.current || chartRef.current.isDisposed()) {
      chartRef.current = echarts.init(container, undefined, { renderer: 'svg' });
    }

    if (chartSeries.length === 0) {
      chartRef.current.clear();
      return;
    }

    const cfg = INDEX_CHART_CONFIG;

    // Диапазон оси Y с отступами
    const values = chartSeries.map(([, v]) => v);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const yMin = dataMin * cfg.yAxis.yPaddingBottom;
    const yMax = dataMax * cfg.yAxis.yPaddingTop;

    // Последняя точка для markLine
    const lastPoint = chartSeries[chartSeries.length - 1];

    // ─── Форматтер тултипа ─────────────────────────────────────────────────
    const tooltipFormatter: NonNullable<TooltipComponentOption['formatter']> = (params: unknown) => {
      const raw = Array.isArray(params) ? params[0] : params;
      if (!raw || typeof raw !== 'object' || !('value' in raw)) return '';
      const val = (raw as Record<string, unknown>).value;
      if (!Array.isArray(val) || val.length < 2 || typeof val[0] !== 'number' || typeof val[1] !== 'number') return '';

      // Обновляем цену в заголовке при hover
      setHeaderValue(val[1]);

      const date = new Date(val[0]).toLocaleString('ru-RU', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      });
      const label = cfg.yAxisMode === 'usd'
        ? formatUsd(val[1])
        : `${val[1].toFixed(2)}`;

      return `
        <div style="font-size:11px;color:#64748b;margin-bottom:4px">${date}</div>
        <div style="font-size:14px;font-weight:600;color:#f1f5f9">${label}</div>
      `;
    };

    const option: EChartsOption = {
      animation: cfg.animation.enabled,
      animationDuration: cfg.animation.duration,
      animationEasing: cfg.animation.easing,
      grid: cfg.grid,

      // ─── Ось X ───────────────────────────────────────────────────────────
      xAxis: { ...cfg.xAxis },

      // ─── Ось Y: скрыта, диапазон с отступами ─────────────────────────────
      yAxis: {
        show: false,
        type: 'value' as const,
        min: yMin,
        max: yMax,
        splitLine: cfg.yAxis.splitLine,
      },

      // ─── Crosshair ───────────────────────────────────────────────────────
      axisPointer: {
        type: 'line',
        lineStyle: cfg.axisPointer.lineStyle,
        label: { show: false },
      },

      // ─── Тултип ──────────────────────────────────────────────────────────
      tooltip: {
        show: cfg.tooltip.show,
        trigger: cfg.tooltip.trigger,
        backgroundColor: cfg.tooltip.backgroundColor,
        borderColor: cfg.tooltip.borderColor,
        borderWidth: cfg.tooltip.borderWidth,
        textStyle: cfg.tooltip.textStyle,
        padding: [...cfg.tooltip.padding],
        formatter: tooltipFormatter as TooltipComponentOption['formatter'],
        // Сбрасываем заголовок на lastValue при уходе курсора
        // (через onMouseout в useEffect ниже)
      },

      series: [
        {
          type: 'line',
          data: chartSeries,
          smooth: cfg.chart.smooth,
          symbol: 'circle',        // кружок на линии при hover
          symbolSize: 6,
          showSymbol: false,          // скрыт постоянно, виден только при hover
          lineStyle: {
            width: cfg.chart.lineWidth,
            color: colorSet.line,
          },

          // ─── Заливка под линией ─────────────────────────────────────────
          areaStyle:
            cfg.chart.type === 'area'
              ? {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: colorSet.areaTop },
                  { offset: 1, color: colorSet.areaBottom },
                ]),
              }
              : undefined,

          // ─── Метка последнего значения на правом краю ───────────────────
          endLabel: {
            show: cfg.endLabel.show,
            formatter: () => cfg.yAxisMode === 'usd'
              ? formatUsd(lastPoint[1])
              : `${lastPoint[1].toFixed(2)}`,
            color: '#0f172a',
            backgroundColor: colorSet.line,
            borderRadius: 3,
            padding: [...cfg.endLabel.padding],
            fontSize: cfg.endLabel.fontSize,
            fontWeight: 600,
          },

          // ─── Пунктирная горизонталь от последней точки ──────────────────
          markLine: cfg.lastValueLine.show
            ? {
              silent: true,
              symbol: ['none', 'none'],
              animation: false,
              data: [
                { yAxis: lastPoint[1] },
              ],
              lineStyle: {
                color: colorSet.line,
                type: cfg.lastValueLine.lineStyle.type,
                width: cfg.lastValueLine.lineStyle.width,
                opacity: 0.5,
              },
              label: { show: false },
            }
            : undefined,

          emphasis: { disabled: true },
          itemStyle: { color: colorSet.line },
        },
      ],
    };

    chartRef.current.setOption(option, false);
  }, [chartSeries, direction]); // direction вызывает перерисовку при смене цвета

  // ─── Сброс headerValue при уходе курсора с графика ────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const handleMouseOut = () => setHeaderValue(lastValue);
    chart.on('globalout', handleMouseOut);
    return () => { chart.off('globalout', handleMouseOut); };
  }, [lastValue]);

  // ─── ResizeObserver ────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      if (chartRef.current && !chartRef.current.isDisposed()) {
        chartRef.current.resize();
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ─── Очистка при анмаунте ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (chartRef.current && !chartRef.current.isDisposed()) {
        chartRef.current.dispose();
        chartRef.current = null;
      }
    };
  }, []);

  // ─── Рендер ───────────────────────────────────────────────────────────────
  const hasData = !isLoading && !isError && data && data.length > 0;

  return (
    <div className="index-chart-wrapper">

      {/* ── Заголовок ─────────────────────────────────────────────────────── */}
      <div className="index-chart-header">

        {/* Цена: обновляется при hover */}
        <div className="index-chart-portfolio-value">
          {isLoading ? (
            <span className="index-chart-value-placeholder">—</span>
          ) : isError || !hasData ? (
            <span className="index-chart-value-placeholder">—</span>
          ) : (
            formatUsd(headerValue ?? lastValue ?? 0)
          )}
        </div>

        {/* Дельта за период: +$1,240 (↑ 4.2%) */}
        {hasData && delta && (
          <div
            className="index-chart-delta"
            style={{ color: INDEX_CHART_CONFIG.colors[delta.direction].delta }}
          >
            {delta.text}
          </div>
        )}

      </div>

      {/* ── График ────────────────────────────────────────────────────────── */}
      <div className="index-chart-viewport">

        {/*
          Контейнер ECharts ВСЕГДА в DOM — это критично.
          containerRef.current гарантированно доступен в useEffect.
          Состояния рендерятся поверх через z-index.
        */}
        {/* isFetching (не isLoading) — данные уже есть, но идёт фоновый рефетч.
            Затемняем старый график вместо того чтобы показывать skeleton. */}
        <div
          ref={containerRef}
          className={[
            'index-chart-container',
            isFetching && !isLoading ? 'index-chart-container--fetching' : '',
          ].join(' ').trim()}
        />

        {/* Skeleton при загрузке */}
        {isLoading && <SkeletonChart />}

        {/* Ошибка или пустое состояние */}
        {!isLoading && (isError || !hasData) && (
          <div className="index-chart-state">
            {isError
              ? INDEX_CHART_CONFIG.states.error
              : INDEX_CHART_CONFIG.states.empty}
          </div>
        )}

      </div>

      {/* ── Кнопки таймфреймов ────────────────────────────────────────────── */}
      <div className="index-chart-controls">
        {INDEX_CHART_CONFIG.ranges.map((r) => (
          <button
            key={r.key}
            className={`index-chart-btn ${range === r.key ? 'index-chart-btn--active' : ''}`}
            style={range === r.key ? { borderColor: colorSet.line, background: colorSet.line } : undefined}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

    </div>
  );
};
