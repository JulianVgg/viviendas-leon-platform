/** Gráficos de TailAdmin Pro (ApexCharts), conectados a indicadores reales de Viviendas León. */
import { useEffect, useMemo, useState } from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { useTheme } from '@/app/providers/ThemeContext'

const BRAND = '#3C6E8E'
const TEAL = '#15A38D'
const SOFT = '#BFD7E5'

const formatNumber = (value: number) => value.toLocaleString('es-GT', { maximumFractionDigits: 2 })

function useChartAppearance() {
  const { theme } = useTheme()
  const [reduceMotion, setReduceMotion] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduceMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return useMemo(() => ({
    dark: theme === 'dark',
    reduced: reduceMotion,
    foreColor: theme === 'dark' ? '#98A2B3' : '#667085',
    gridColor: theme === 'dark' ? '#344054' : '#E4E7EC',
  }), [theme, reduceMotion])
}

type Series = { name: string; data: number[] }
type AxisChartProps = {
  labels: string[]
  series: Series[]
  ariaLabel: string
  height?: number
  unit?: string
  colors?: string[]
}

type BarChartProps = AxisChartProps & {
  horizontal?: boolean
  stacked?: boolean
}

function axisOptions(appearance: ReturnType<typeof useChartAppearance>, labels: string[], colors: string[], unit?: string): ApexOptions {
  return {
    colors,
    chart: {
      fontFamily: 'PT Sans, Segoe UI, sans-serif',
      background: 'transparent',
      foreColor: appearance.foreColor,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: {
        enabled: !appearance.reduced,
        speed: 550,
        animateGradually: { enabled: !appearance.reduced, delay: 45 },
        dynamicAnimation: { enabled: !appearance.reduced, speed: 320 },
      },
    },
    dataLabels: { enabled: false },
    grid: { borderColor: appearance.gridColor, strokeDashArray: 4, padding: { left: 3, right: 8 } },
    xaxis: {
      categories: labels,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: '12px' }, trim: true },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: { formatter: (value: number) => formatNumber(value) },
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontFamily: 'PT Sans, sans-serif',
      fontSize: '12px',
      markers: { size: 6 },
      itemMargin: { horizontal: 10, vertical: 6 },
    },
    tooltip: {
      theme: appearance.dark ? 'dark' : 'light',
      shared: true,
      intersect: false,
      y: { formatter: (value: number) => `${formatNumber(value)}${unit ? ` ${unit}` : ''}` },
    },
    noData: { text: 'Sin registros' },
  }
}

/** Derivado de ActiveUsersChart y LineChartOne de TailAdmin Pro 2.4. */
export function ProAreaChart({ labels, series, ariaLabel, height = 290, unit, colors = [BRAND, TEAL] }: AxisChartProps) {
  const appearance = useChartAppearance()
  const options = useMemo<ApexOptions>(() => {
    const base = axisOptions(appearance, labels, colors, unit)
    return {
      ...base,
      chart: { ...base.chart, type: 'area' },
      stroke: { curve: 'smooth', width: 3, lineCap: 'round' },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.30, opacityTo: 0.015, stops: [0, 85, 100] },
      },
      markers: { size: 0, hover: { size: 5 } },
    }
  }, [appearance, labels, colors, unit])
  return <div className="dashboard-pro-chart min-w-0" role="group" aria-label={ariaLabel}>
    <Chart options={options} series={series} type="area" height={height} />
  </div>
}

/** Configuración derivada de AnalyticsBarChart de TailAdmin Pro 2.4. */
export function ProBarChart({ labels, series, ariaLabel, height = 280, unit, colors = [BRAND, TEAL], horizontal = false, stacked = false }: BarChartProps) {
  const appearance = useChartAppearance()
  const options = useMemo<ApexOptions>(() => {
    const base = axisOptions(appearance, labels, colors, unit)
    return {
      ...base,
      chart: { ...base.chart, type: 'bar', stacked },
      plotOptions: {
        bar: {
          horizontal,
          columnWidth: '42%',
          barHeight: '52%',
          borderRadius: 5,
          borderRadiusApplication: 'end',
        },
      },
      stroke: { width: 2, colors: ['transparent'] },
      fill: { opacity: 1 },
      xaxis: horizontal ? {
        ...base.xaxis,
        labels: { style: { fontSize: '12px' }, formatter: (value: string) => String(value) },
      } : base.xaxis,
      yaxis: horizontal ? {
        labels: { maxWidth: 135, style: { fontSize: '12px' } },
      } : base.yaxis,
      legend: { ...base.legend, show: series.length > 1 },
      tooltip: { ...base.tooltip, shared: !horizontal || stacked },
    }
  }, [appearance, labels, colors, unit, horizontal, stacked, series.length])
  return <div className="dashboard-pro-chart min-w-0" role="group" aria-label={ariaLabel}>
    <Chart options={options} series={series} type="bar" height={height} />
  </div>
}

/** Anillo basado en SessionChart de TailAdmin Pro 2.4. */
export function ProDonutChart({ labels, values, ariaLabel, height = 260 }: {
  labels: string[]
  values: number[]
  ariaLabel: string
  height?: number
}) {
  const appearance = useChartAppearance()
  const options = useMemo<ApexOptions>(() => ({
    colors: [BRAND, SOFT],
    chart: {
      type: 'donut',
      fontFamily: 'PT Sans, Segoe UI, sans-serif',
      foreColor: appearance.foreColor,
      animations: { enabled: !appearance.reduced, speed: 550 },
    },
    labels,
    stroke: { width: 3, colors: [appearance.dark ? '#101828' : '#fff'] },
    plotOptions: { pie: { donut: { size: '70%', labels: {
      show: true,
      name: { show: true, fontSize: '12px' },
      value: { show: true, fontSize: '21px', formatter: (value: string) => formatNumber(Number(value)) },
      total: { show: true, showAlways: true, label: 'Familias', formatter: () => formatNumber(values.reduce((sum, n) => sum + n, 0)) },
    } } } },
    dataLabels: { enabled: false },
    legend: { position: 'bottom', fontFamily: 'PT Sans, sans-serif', fontSize: '12px', markers: { size: 7 } },
    tooltip: { theme: appearance.dark ? 'dark' : 'light', y: { formatter: (value: number) => `${formatNumber(value)} familias` } },
    responsive: [{ breakpoint: 480, options: { chart: { height: 250 }, legend: { position: 'bottom' } } }],
  }), [appearance, labels, values])
  return <div className="dashboard-pro-chart min-w-0" role="group" aria-label={ariaLabel}>
    <Chart options={options} series={values} type="donut" height={height} />
  </div>
}
