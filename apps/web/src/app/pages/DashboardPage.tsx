import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AlertCircle, CalendarDays, ChartNoAxesCombined, CheckCircle2, GraduationCap, Leaf, RefreshCw, Sprout, UsersRound } from 'lucide-react'
import PageMeta from '@/components/common/PageMeta'
import { consultarDashboard, consultarFamiliasProgramas, consultarIndicadoresVisitasCapacitaciones, consultarIndicadoresAgricolas, type IndicadoresAgricolas, type ResumenDashboard, type ResumenFamiliasProgramas, type IndicadoresVisitasCapacitaciones, type TipoDetalleIndicador } from '@/features/dashboard/services/dashboardSummaryService'
import FamiliasProgramasPanel from '@/features/dashboard/pages/FamiliasProgramasPanel'
import VisitasCapacitacionesPanel from '@/features/dashboard/pages/VisitasCapacitacionesPanel'
import IndicadorDetalleDialog from '@/features/dashboard/pages/IndicadorDetalleDialog'
import AgriculturaProduccionPanel from '@/features/dashboard/pages/AgriculturaProduccionPanel'
import { ProAreaChart } from '@/features/dashboard/charts/TailAdminCharts'
import { seriesActividad } from '@/features/dashboard/lib/chartSeries'

const tarjeta = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900'
type Icono = typeof UsersRound

function Indicador({ etiqueta, valor, icono: Icono, onClick }: { etiqueta: string; valor: number; icono: Icono; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-label={`Ver detalle de ${etiqueta}`}
    className={`${tarjeta} w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500`}>
    <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Icono size={20} strokeWidth={1.7}/></span>
    <span className="mt-5 block text-3xl font-semibold tracking-tight tabular-nums text-gray-900 dark:text-white">{valor.toLocaleString('es-GT')}</span>
    <span className="mt-2 block text-sm text-gray-500 dark:text-gray-400">{etiqueta}</span>
  </button>
}

function GraficaActividad({ datos }: { datos: ResumenDashboard['actividadMensual'] }) {
  const { labels, series } = seriesActividad(datos)
  const sinActividad = datos.every(dato => dato.visitas === 0 && dato.capacitaciones === 0)
  return <section className={tarjeta} aria-label="Actividad mensual">
    <h2 className="mb-3 text-base font-semibold text-gray-800 dark:text-white">Actividad por mes</h2>
    {sinActividad
      ? <p className="py-20 text-center text-sm text-gray-500">Sin actividad en este período.</p>
      : <ProAreaChart labels={labels} series={series} ariaLabel="Visitas realizadas y capacitaciones por mes" height={280}/>}
  </section>
}

export default function DashboardPage() {
  const [meses, setMeses] = useState<3 | 6 | 12>(6)
  const [actualizacion, setActualizacion] = useState(0)
  const [resumen, setResumen] = useState<ResumenDashboard | null>(null)
  const [cargando, setCargando] = useState(true)
  const [familiasProgramas, setFamiliasProgramas] = useState<ResumenFamiliasProgramas | null>(null)
  const [errorFamilias, setErrorFamilias] = useState('')
  const [error, setError] = useState('')
  const [indicadoresOperativos, setIndicadoresOperativos] = useState<IndicadoresVisitasCapacitaciones | null>(null)
  const [errorOperativos, setErrorOperativos] = useState('')
  const [agricultura, setAgricultura] = useState<IndicadoresAgricolas|null>(null)
  const [errorAgricultura, setErrorAgricultura] = useState('')
  const [detalleAbierto, setDetalleAbierto] = useState<TipoDetalleIndicador | null>(null)
  const cerrarDetalle = useCallback(() => setDetalleAbierto(null), [])
  const actualizar = useCallback(() => setActualizacion(v => v + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    setCargando(true); setError('')
    void consultarDashboard(meses, controller.signal).then(data => {
      if (!controller.signal.aborted) setResumen(data)
    }).catch(() => {
      if (!controller.signal.aborted) setError('No se pudieron cargar los indicadores.')
    }).finally(() => { if (!controller.signal.aborted) setCargando(false) })
    return () => controller.abort()
  }, [meses, actualizacion])

  // MON-02 es exclusivamente institucional; no se consulta desde cuentas técnicas.
  useEffect(() => {
    if (resumen?.alcance !== 'INSTITUCIONAL') return
    const controller = new AbortController()
    setErrorFamilias('')
    void consultarFamiliasProgramas(controller.signal).then(datos => {
      if (!controller.signal.aborted) setFamiliasProgramas(datos)
    }).catch(() => {
      if (!controller.signal.aborted) setErrorFamilias('No se pudieron cargar los programas.')
    })
    return () => controller.abort()
  }, [resumen?.alcance, actualizacion])

  useEffect(() => {
    const controller = new AbortController()
    setErrorOperativos(''); setIndicadoresOperativos(null)
    void consultarIndicadoresVisitasCapacitaciones(meses, controller.signal).then(data => {
      if (!controller.signal.aborted) setIndicadoresOperativos(data)
    }).catch(() => { if (!controller.signal.aborted) setErrorOperativos('No se pudieron cargar las actividades.') })
    return () => controller.abort()
  }, [meses, actualizacion])

  // No solicitar información agrícola institucional desde cuentas operativas.
  useEffect(() => {
    if (resumen?.alcance !== 'INSTITUCIONAL') { setAgricultura(null); return }
    const controller = new AbortController()
    setErrorAgricultura(''); setAgricultura(null)
    void consultarIndicadoresAgricolas(meses, controller.signal).then(data => {
      if (!controller.signal.aborted) setAgricultura(data)
    }).catch(() => { if (!controller.signal.aborted) setErrorAgricultura('No se pudieron cargar los indicadores agrícolas.') })
    return () => controller.abort()
  }, [resumen?.alcance, meses, actualizacion])

  const institucional = resumen?.alcance === 'INSTITUCIONAL'
  const indicadores: Array<{ etiqueta: string; valor: number; icono: Icono; tipo: TipoDetalleIndicador }> = []
  if (resumen) {
    if (institucional) {
      indicadores.push({ etiqueta:'Familias beneficiarias', valor: resumen.indicadores.familias ?? 0, icono:UsersRound, tipo:'familias' })
      indicadores.push({ etiqueta:'Huertos activos', valor:resumen.indicadores.huertosActivos ?? 0, icono:Sprout, tipo:'huertos' })
      indicadores.push({ etiqueta:'Ciclos activos', valor:resumen.indicadores.ciclosActivos ?? 0, icono:Leaf, tipo:'ciclos' })
    }
    indicadores.push({ etiqueta:'Visitas realizadas', valor:resumen.indicadores.visitasRealizadas, icono:CheckCircle2, tipo:'visitas' })
    indicadores.push({ etiqueta:'Capacitaciones', valor:resumen.indicadores.capacitaciones, icono:GraduationCap, tipo:'capacitaciones' })
    indicadores.push({ etiqueta:'Visitas vencidas', valor:resumen.indicadores.visitasVencidas, icono:AlertCircle, tipo:'vencidas' })
  }
  let contenido: ReactNode = null
  if (cargando && !resumen) contenido = <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">Cargando indicadores...</div>
  else if (error) contenido = <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20">{error} <button type="button" onClick={actualizar} className="ml-2 font-semibold underline">Reintentar</button></div>
  else if (resumen) contenido = <>
    <div className={`grid grid-cols-2 gap-3 md:gap-5 ${institucional ? 'xl:grid-cols-3' : 'lg:grid-cols-3'}`}>
      {indicadores.map(item => <Indicador key={item.etiqueta} etiqueta={item.etiqueta} valor={item.valor} icono={item.icono} onClick={() => setDetalleAbierto(item.tipo)} />)}
    </div>
    <GraficaActividad datos={resumen.actividadMensual}/>
    {indicadoresOperativos && <VisitasCapacitacionesPanel datos={indicadoresOperativos}/>}
    {errorOperativos && <p role="alert" className="text-sm text-rose-600">{errorOperativos}</p>}
    {institucional && familiasProgramas && <FamiliasProgramasPanel datos={familiasProgramas} />}
    {institucional && agricultura && <AgriculturaProduccionPanel datos={agricultura}/>}
    {institucional && errorAgricultura && <p role="alert" className="text-sm text-rose-600">{errorAgricultura}</p>}
    {institucional && !familiasProgramas && !errorFamilias && <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">Cargando participación...</div>}
    {institucional && errorFamilias && <p role="alert" className="text-sm text-rose-600">{errorFamilias}</p>}
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <Link to="/mi-agenda" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 font-medium text-brand-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-brand-300"><CalendarDays size={16}/> Mi agenda</Link>
    </div>
  </>
  return <main className="dashboard-page-enter mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
    <PageMeta title="Dashboard | Viviendas León" description="Indicadores de actividades y programas" />
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-white"><ChartNoAxesCombined size={25} className="text-brand-600"/> Dashboard</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{institucional ? 'Resumen institucional' : 'Mi actividad'}</p></div>
      <div className="flex items-center gap-2"><label htmlFor="dashboard-meses" className="sr-only">Período</label><select id="dashboard-meses" value={meses} onChange={event => setMeses(Number(event.target.value) as 3 | 6 | 12)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"><option value={3}>3 meses</option><option value={6}>6 meses</option><option value={12}>12 meses</option></select><button type="button" onClick={actualizar} aria-label="Actualizar indicadores" disabled={cargando} className="rounded-lg border border-gray-300 p-2.5 text-gray-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"><RefreshCw size={18}/></button></div>
    </div>
    <div className="dashboard-content-enter space-y-6">{contenido}</div>
    {detalleAbierto && <IndicadorDetalleDialog key={`${detalleAbierto}-${meses}`} tipo={detalleAbierto} meses={meses} cerrar={cerrarDetalle}/>}
  </main>
}
