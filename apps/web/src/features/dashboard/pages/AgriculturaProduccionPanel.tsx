import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight, CalendarDays } from 'lucide-react'
import type { IndicadoresAgricolas } from '../services/dashboardSummaryService'
import { ProBarChart } from '../charts/TailAdminCharts'
import { seriesProduccion, seriesComunidadesAgricolas } from '../lib/chartSeries'
import type { FiltrosDashboard } from '../lib/dashboardFilters'
import { construirEnlaceReportesDashboard } from '@/features/reports/services/semesterReportFilters'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath } from '@/features/auth/screenPermissions'

const panel = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900'

export default function AgriculturaProduccionPanel({ datos, meses, filtros, alSalir }: { datos: IndicadoresAgricolas; meses: 3 | 6 | 12; filtros: FiltrosDashboard; alSalir: () => void }) {
  const { usuario } = useAuth()
  const mostrarComparacion = Boolean(usuario && canViewPath(usuario, '/reportes/reportes'))
  const [modo, setModo] = useState<'kg' | 'unidades'>('kg')
  const produccion = seriesProduccion(datos, modo)
  const comunidades = seriesComunidadesAgricolas(datos)

  return <section aria-label="Agricultura y producción" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Agricultura y producción</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Últimos {meses} meses · {datos.periodo.desde} al {datos.periodo.hasta}</p></div>
      <div className="flex flex-wrap gap-2">
        {mostrarComparacion && <Link onClick={alSalir} to={construirEnlaceReportesDashboard({ desde: datos.periodo.desde, hasta: datos.periodo.hasta, comunidadId: filtros.comunidadId })} className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300">Comparar en Reportes <ArrowUpRight size={16}/></Link>}
        <Link to="/gestion-agricola/huertos" onClick={alSalir} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-900 dark:text-brand-300">Ver huertos <ArrowUpRight size={16}/></Link>
      </div>
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <div className={panel}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><CalendarDays size={17} className="text-brand-600"/><h3 className="text-sm font-semibold text-gray-800 dark:text-white">Producción por mes</h3></div>
          <div className="inline-flex rounded-lg border border-gray-200 p-1 dark:border-gray-700" role="group" aria-label="Unidad del gráfico">
            {(['kg', 'unidades'] as const).map(opcion => <button key={opcion} type="button" onClick={() => setModo(opcion)} aria-pressed={modo === opcion} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${modo === opcion ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>{opcion === 'kg' ? 'Kilogramos' : 'Unidades'}</button>)}
          </div>
        </div>
        {datos.produccionMensual.some(item => item[modo] > 0) ? <ProBarChart labels={produccion.labels.map(mes => new Intl.DateTimeFormat('es-GT', { month: 'short', timeZone: 'UTC' }).format(new Date(`${mes}-15T12:00:00Z`)))} series={produccion.series} ariaLabel={`Producción registrada por mes en ${modo}`} height={305} unit={modo} colors={['#3C6E8E']}/> : <p className="py-20 text-center text-sm text-gray-500">Sin producción registrada en {modo}.</p>}
      </div>
      <div className={panel}>
        <h3 className="mb-5 text-sm font-semibold text-gray-800 dark:text-white">Siembras por comunidad</h3>
        {datos.porComunidad.length > 0 ? <ProBarChart labels={comunidades.labels} series={comunidades.series} ariaLabel="Ciclos activos y familias por comunidad" height={Math.max(305, Math.min(500, datos.porComunidad.length * 38))} colors={['#3C6E8E', '#15A38D']}/> : <p className="py-20 text-center text-sm text-gray-500">Sin siembras registradas.</p>}
      </div>
    </div>
  </section>
}
