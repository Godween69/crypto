// front/src/components/Analytics/PortfolioIndexChart/PortfolioIndexChart.tsx
import { useEffect, useRef, useMemo, useState } from 'react';
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';
import * as echarts from 'echarts';
import type { EChartsOption, TooltipComponentOption } from 'echarts';
import { INDEX_CHART_CONFIG } from './index-chart.config';
import type { RangeKey } from './index-chart.config';
import './PortfolioIndexChart.css';

type IndexPoint = { timestamp: string; value: number };

const formatUsd = (val: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

export const PortfolioIndexChart = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const [range, setRange] = useState<RangeKey>(INDEX_CHART_CONFIG.defaultRange);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<IndexPoint[]>({
    queryKey: ['portfolio-index', range],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/analytics/portfolio-index?range=${range}`);
      if (!res.ok) throw new Error('Failed to fetch index');
      const json = await res.json();
      return json as IndexPoint[];
    },
    staleTime: 30_000, // 🔥 сокращено до 30 сек для быстрой синхронизации после сделок
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  // публичный метод для мгновенной инвалидации кэша после транзакций
  useEffect(() => {
    // слушаем кастомное событие от формы транзакций
    const handler = () => queryClient.invalidateQueries({ queryKey: ['portfolio-index'] });
    window.addEventListener('portfolio:transaction:success', handler);
    return () => window.removeEventListener('portfolio:transaction:success', handler);
  }, [queryClient]);

  const chartSeries = useMemo((): [number, number][] => {
    if (!data || data.length === 0) return [];
    if (INDEX_CHART_CONFIG.yAxisMode === 'usd') {
      return data.map((p) => [new Date(p.timestamp).getTime(), p.value]);
    }
    const first = data[0].value;
    if (first === 0) return [];
    return data.map((p) => [new Date(p.timestamp).getTime(), (p.value / first) * 100]);
  }, [data]);

  const currentPortfolioValue = useMemo(() => {
    if (!data || data.length === 0) return null;
    return data[data.length - 1].value;
  }, [data]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || chartSeries.length === 0) return;
    if (container.clientWidth === 0 || container.clientHeight === 0) return;

    if (!chartRef.current || chartRef.current.isDisposed()) {
      chartRef.current = echarts.init(container, undefined, { renderer: 'svg' });
    }

    const cfg = INDEX_CHART_CONFIG;
    const now = Date.now();
    const rangeHours: Record<RangeKey, number> = { '1d': 24, '7d': 168, '30d': 720, '90d': 2160, '1y': 8760, 'all': 0 };
    const minX = rangeHours[range] > 0 ? now - rangeHours[range] * 3600_000 : undefined;

    const tooltipFormatter: NonNullable<TooltipComponentOption['formatter']> = (params: unknown) => {
      const raw = Array.isArray(params) ? params[0] : params;
      if (!raw || typeof raw !== 'object' || !('value' in raw)) return '';
      const val = (raw as Record<string, unknown>).value;
      if (!Array.isArray(val) || val.length < 2 || typeof val[0] !== 'number' || typeof val[1] !== 'number') return '';
      const date = new Date(val[0]).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      const value = val[1];
      const label = cfg.yAxisMode === 'usd' ? formatUsd(value) : `${value.toFixed(2)}%`;
      return `${date}<br/>${label}`;
    };

    const option: EChartsOption = {
      animation: cfg.animation.enabled,
      animationDuration: cfg.animation.duration,
      animationEasing: cfg.animation.easing,
      grid: cfg.grid,
      xAxis: { ...cfg.xAxis, min: minX, max: now },
      yAxis: cfg.yAxis,
      tooltip: {
        show: cfg.tooltip.show,
        trigger: cfg.tooltip.trigger,
        backgroundColor: cfg.tooltip.backgroundColor,
        borderColor: cfg.tooltip.borderColor,
        borderWidth: cfg.tooltip.borderWidth,
        textStyle: cfg.tooltip.textStyle,
        padding: [...cfg.tooltip.padding],
        formatter: tooltipFormatter as TooltipComponentOption['formatter'],
      },
      series: [{
        type: 'line',
        data: chartSeries,
        smooth: cfg.chart.smooth,
        symbol: cfg.chart.symbol,
        lineStyle: { width: cfg.chart.lineWidth, color: cfg.chart.lineColor },
        areaStyle: cfg.chart.type === 'area' ? {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: cfg.chart.areaColor[0] },
            { offset: 1, color: cfg.chart.areaColor[1] },
          ]),
        } : undefined,
        emphasis: { disabled: true },
      }],
    };

    chartRef.current.setOption(option, true);
  }, [chartSeries, range]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      if (chartRef.current && !chartRef.current.isDisposed()) chartRef.current.resize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (chartRef.current && !chartRef.current.isDisposed()) {
        chartRef.current.dispose();
        chartRef.current = null;
      }
    };
  }, []);

  return (
    <div className="index-chart-wrapper">
      <div className="index-chart-header">
        <div className="index-chart-portfolio-value">
          {isLoading ? (
            <span className="index-chart-value-skeleton">—</span>
          ) : isError || !data || data.length === 0 ? (
            <span className="index-chart-value-empty">—</span>
          ) : (
            formatUsd(currentPortfolioValue!)
          )}
        </div>
      </div>

      <div className="index-chart-viewport">
        {isLoading ? (
          <div className="index-chart-state">{INDEX_CHART_CONFIG.states.loading}</div>
        ) : isError ? (
          <div className="index-chart-state">{INDEX_CHART_CONFIG.states.error}</div>
        ) : !data || data.length === 0 ? (
          <div className="index-chart-state">{INDEX_CHART_CONFIG.states.empty}</div>
        ) : (
          <div ref={containerRef} className="index-chart-container" />
        )}
      </div>

      <div className="index-chart-controls">
        {INDEX_CHART_CONFIG.ranges.map((r) => (
          <button
            key={r.key}
            className={`index-chart-btn ${range === r.key ? 'index-chart-btn--active' : ''}`}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
};