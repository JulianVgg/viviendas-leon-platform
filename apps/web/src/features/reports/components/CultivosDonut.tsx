/** Adaptación del gráfico de anillo de TailAdmin Pro para kilos cosechados. */
import { useEffect, useMemo, useState } from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { useTheme } from '@/app/providers/ThemeContext'

const COLORS = ['#3C6E8E', '#73B4C2', '#15A38D', '#F2C36B', '#8AA0C7', '#ADC7B3', '#CBD5E1']
export default function CultivosDonut({ cultivos }: { cultivos: Array<{ nombre: string; kg: number }> }) {
  const { theme } = useTheme()
  const [reduceMotion, setReduceMotion] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduceMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  const options = useMemo<ApexOptions>(() => ({
    chart: { fontFamily: 'PT Sans, sans-serif', type: 'donut', background: 'transparent', animations: { enabled: !reduceMotion, speed: 600 } },
    colors: COLORS,
    labels: cultivos.map(c => c.nombre),
    stroke: { width: 2, colors: [theme === 'dark' ? '#101828' : '#fff'] },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '70%', labels: {
      show: true,
      name: { show: true, fontSize: '12px', color: theme === 'dark' ? '#98A2B3' : '#667085' },
      value: { show: true, fontSize: '21px', formatter: (v: string) => `${Number(v).toLocaleString('es-GT', { maximumFractionDigits: 2 })} kg` },
      total: { show: true, showAlways: true, label: 'Total cosechado', color: theme === 'dark' ? '#F2F4F7' : '#344054', formatter: () => `${cultivos.reduce((sum, c) => sum + c.kg, 0).toLocaleString('es-GT', { maximumFractionDigits: 2 })} kg` },
    } } } },
    legend: { position: 'bottom', fontFamily: 'PT Sans, sans-serif', fontSize: '12px', labels: { colors: theme === 'dark' ? '#98A2B3' : '#667085' } },
    tooltip: { theme: theme === 'dark' ? 'dark' : 'light', y: { formatter: (v: number) => `${v.toLocaleString('es-GT', { maximumFractionDigits: 2 })} kg` } },
    responsive: [{ breakpoint: 480, options: { chart: { height: 300 } } }],
  }), [cultivos, theme, reduceMotion])
  return <div role="group" aria-label="Distribución de producción en kilogramos por cultivo" className="min-w-0">
    <Chart options={options} series={cultivos.map(c => c.kg)} type="donut" height={320} />
  </div>
}
