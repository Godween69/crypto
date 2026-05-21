// front/src/components/Analytics/PortfolioDistributionChart/PortfolioDistributionChart.tsx
import { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { usePortfolio } from '../../../hooks/usePortfolio';
import { useMarketData } from '../../../hooks/useMarketData';
import { CHART_CONFIG } from './chart.config';

export const PortfolioDistributionChart = () => {
  const containerRef = useRef<HTMLDivElement>(null); // ссылка на DOM-контейнер
  const chartRef = useRef<echarts.ECharts | null>(null); // ссылка на инстанс ECharts

  const portfolioQuery = usePortfolio(); // запрос транзакций из БД
  const symbols = useMemo(() => portfolioQuery.data?.map((i) => i.symbol) ?? [], [portfolioQuery.data]); // извлекаем тикеры
  const marketQuery = useMarketData(symbols); // запрос рыночных цен

  // 1. Трансформация сырых данных в формат ECharts (чистое вычисление)
  const chartData = useMemo(() => {
    if (!portfolioQuery.data || !marketQuery.data) return [];
    const marketMap = new Map(marketQuery.data.map((m) => [m.symbol.toUpperCase(), m]));
    return portfolioQuery.data
      .map((item) => {
        const market = marketMap.get(item.symbol.toUpperCase());
        const value = item.amount * (market?.currentPrice ?? 0);
        return { name: item.symbol.toUpperCase(), value };
      })
      .filter((d) => d.value > 0); // исключаем позиции с нулевой стоимостью
  }, [portfolioQuery.data, marketQuery.data]);

  // 2. Агрегация, сортировка и расчёт процентов (чистое вычисление)
  const processedData = useMemo(() => {
    if (chartData.length === 0) return [];
    const total = chartData.reduce((sum, d) => sum + d.value, 0);
    const sorted = [...chartData].sort((a, b) => b.value - a.value); // сортировка по убыванию стоимости
    const limit = CHART_CONFIG.aggregation.maxVisibleItems;
    const topItems = sorted.slice(0, limit);
    const othersSum = sorted.slice(limit).reduce((sum, d) => sum + d.value, 0);

    const result = topItems.map((d) => ({
      name: d.name,
      value: d.value,
      percent: total > 0 ? (d.value / total) * 100 : 0,
    }));

    if (othersSum > 0) {
      result.push({
        name: CHART_CONFIG.aggregation.othersLabel,
        value: othersSum,
        percent: total > 0 ? (othersSum / total) * 100 : 0,
      });
    }
    return result;
  }, [chartData]);

  // 3. Синхронизация ECharts с React-состоянием
  useEffect(() => {
    const container = containerRef.current;
    if (!container || processedData.length === 0) return; // ждём DOM и данных
    if (container.clientWidth === 0 || container.clientHeight === 0) return; // защита от нулевых размеров до paint

    if (!chartRef.current || chartRef.current.isDisposed()) {
      chartRef.current = echarts.init(container, undefined, { renderer: 'svg' }); // создаём инстанс один раз
    }

    const cfg = CHART_CONFIG;
    const legendPos: Record<string, string | number> = { [cfg.legend.position]: '5%' }; // динамическое позиционирование

    const option: echarts.EChartsOption = {
      color: [...cfg.colors], // разворачиваем readonly массив для совместимости с типами ECharts
      animation: cfg.animation.enabled, // глобальный флаг анимации
      animationDuration: cfg.animation.duration, // длительность перехода
      animationEasing: cfg.animation.easing, // кривая плавности
      axisPointer: cfg.axisPointer, // отключаем вспомогательные линии на корневом уровне
      tooltip: {
        show: cfg.tooltip.show,
        trigger: cfg.tooltip.trigger,
        backgroundColor: cfg.tooltip.backgroundColor,
        borderColor: cfg.tooltip.borderColor,
        borderWidth: cfg.tooltip.borderWidth,
        textStyle: cfg.tooltip.textStyle,
        formatter: cfg.tooltip.formatter,
        padding: [...cfg.tooltip.padding], // mutable-копия для типов ECharts
      },
      legend: {
        show: cfg.legend.show,
        orient: cfg.legend.orient,
        ...legendPos,
        align: cfg.legend.align,
        itemGap: cfg.legend.itemGap,
        itemWidth: cfg.legend.itemWidth,
        itemHeight: cfg.legend.itemHeight,
        textStyle: cfg.legend.textStyle,
        padding: [...cfg.legend.padding], // mutable-копия для типов ECharts
        formatter: (name: string) => { // кастомный форматтер легенды с процентами
          const item = processedData.find((d) => d.name === name);
          const pct = item ? item.percent.toFixed(1) : '0.0';
          return cfg.legend.showPercent ? `${name}  ${pct}%` : name;
        },
      },
      series: [{
        type: 'pie',
        radius: [cfg.radius.inner, cfg.radius.outer],
        center: [cfg.center.x, cfg.center.y],
        itemStyle: cfg.itemStyle,
        label: cfg.label,
        emphasis: cfg.hover.enabled ? { // конфигурируем hover-эффекты вместо жёсткого отключения
          scale: cfg.hover.scale,
          itemStyle: { opacity: cfg.hover.opacity },
        } : { disabled: true },
        data: processedData, // ECharts использует name/value, поле percent игнорируется движком
      }],
    };

    chartRef.current.setOption(option); // merge-режим сохраняет плавные переходы при обновлении данных
  }, [processedData]);

  // 4. Адаптация графика при изменении размеров родительского блока
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      if (chartRef.current && !chartRef.current.isDisposed()) chartRef.current.resize(); // безопасный ресайз
    });
    observer.observe(container);
    return () => observer.disconnect(); // отписка при анмаунте
  }, []);

  // 5. Корректное освобождение памяти при уходе со страницы
  useEffect(() => {
    return () => {
      if (chartRef.current && !chartRef.current.isDisposed()) {
        chartRef.current.dispose(); // уничтожаем SVG-дерево и внутренние слушатели
        chartRef.current = null; // обнуляем ссылку для предотвращения гонок
      }
    };
  }, []);

  // 6. Явные визуальные состояния загрузки и ошибок
  if (portfolioQuery.isLoading || marketQuery.isLoading) return <div className="chart-state">{CHART_CONFIG.states.loading}</div>;
  if (portfolioQuery.error || marketQuery.error) return <div className="chart-state">{CHART_CONFIG.states.error}</div>;
  if (processedData.length === 0) return <div className="chart-state">{CHART_CONFIG.states.empty}</div>;

  return <div ref={containerRef} className="chart-container" />;
};