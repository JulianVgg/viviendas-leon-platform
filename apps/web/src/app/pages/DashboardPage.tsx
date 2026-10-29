import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AlertCircle, CalendarDays, ChartNoAxesCombined, CheckCircle2, GraduationCap, Leaf, RefreshCw, Sprout, UsersRound } from 'lucide-react'
import PageMeta from '@/components/common/PageMeta'
import { consultarDashboard, type ResumenDashboard } from '@/features/dashboard/services/dashboardSummaryService'

const tarjeta = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900'
type Icono = typeof UsersRound

function Indicador({ etiqueta, valor, icono: Icono, detalle }: { etiqueta: string; valor: number; icono: Icono; detalle?: string }) {
  return <article className={tarjeta}>
    <div className="flex items-start justify-between gap-3">
      <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Icono size={20} strokeWidth={1.7}/></span>
      {detalle && <span className="text-xs text-gray-400">{detalle}</span>}
    </div>
    <p className="mt-5 text-3xl font-semibold tracking-tight tabular-nums text-gray-900 dark:text-white">{valor.toLocaleString('es-GT')}</p>
    <h2 className="mt-2 text-sm text-gray-500 dark:text-gray-400">{etiqueta}</h2>
  </article>
}

function GraficaActividad({ datos }: { datos: ResumenDashboard['actividadMensual'] }) {
  const maximo = Math.max(1, ...datos.flatMap(d => [d.visitas, d.capacitaciones]))
  const w = 670, h = 188, left = 34, right = 12, top = 14, bottom = 25
  const x = (i: number) => left + (datos.length === 1 ? 0 : i * (w - left - right) / (datos.length - 1))
  const y = (n: number) => h - bottom - n * (h - top - bottom) / maximo
  const path = (clave: 'visitas' | 'capacitaciones') => datos.map((d, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(d[clave])}`).join(' ')
  const sinDatos = datos.every(d => d.visitas === 0 && d.capacitaciones === 0)
  return <section className={tarjeta}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold text-gray-800 dark:text-white">Actividad por mes</h2>
      <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400"><span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#3C6E8E]"/>Visitas realizadas</span><span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#15A38D]"/>Capacitaciones</span></div></div>
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Gráfico de visitas realizadas y capacitaciones por mes" className="h-auto w-full overflow-visible" preserveAspectRatio="xMidYMid meet">
      {[0, .25, .5, .75, 1].map((f,i)=><g key={i}><line x1={left} y1={y(maximo*f)} x2={w-right} y2={y(maximo*f)} stroke="currentColor" className="text-gray-100 dark:text-gray-800"/><text x={left-8} y={y(maximo*f)+4} textAnchor="end" fontSize="11" fill="currentColor" className="text-gray-400">{Math.round(maximo*f)}</text></g>)}
      {!sinDatos && <><path d={path('visitas')} fill="none" stroke="#3C6E8E" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/><path d={path('capacitaciones')} fill="none" stroke="#15A38D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        {datos.map((d,i)=><g key={d.mes}><circle cx={x(i)} cy={y(d.visitas)} r="4.5" fill="#3C6E8E"><title>{d.mes}: {d.visitas} visitas realizadas</title></circle><circle cx={x(i)} cy={y(d.capacitaciones)} r="4" fill="#15A38D"><title>{d.mes}: {d.capacitaciones} capacitaciones</title></circle></g>)}
      </>}
      {datos.map((d,i)=><text key={d.mes} x={x(i)} y={h-5} fontSize="12" textAnchor="middle" fill="currentColor" className="text-gray-500 dark:text-gray-400">{d.etiqueta}</text>)}
    </svg>
    {sinDatos && <p className="mt-2 text-center text-sm text-gray-500">Sin actividad en este período.</p>}
  </section>
}

function GraficaProgramas({ programas }: { programas: ResumenDashboard['programas'] }) {
  const ordenados = [...programas].sort((a, b) => b.familias - a.familias)
  const maximo = Math.max(1, ...ordenados.map(p => p.familias))
  return <section className={tarjeta}>
    <h2 className="mb-5 text-base font-semibold text-gray-800 dark:text-white">Familias por programa</h2>
    {ordenados.length ? <div className="space-y-5">
      {ordenados.map(programa => <div key={programa.id}>
        <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate text-gray-700 dark:text-gray-300" title={programa.nombre}>{programa.nombre}</span><span className="font-medium tabular-nums text-gray-800 dark:text-white">{programa.familias}</span></div>
        <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-[#3C6E8E] transition-all duration-300" style={{width:`${100*programa.familias/maximo}%`}} /></div>
      </div>)}
    </div> : <p className="py-10 text-center text-sm text-gray-500">Sin programas registrados.</p>}
  </section>
}

export default function DashboardPage() {
  const [meses, setMeses] = useState<3 | 6 | 12>(6)
  const [actualizacion, setActualizacion] = useState(0)
  const [resumen, setResumen] = useState<ResumenDashboard | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
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

  const institucional = resumen?.alcance === 'INSTITUCIONAL'
  const indicadores: Array<{ etiqueta: string; valor: number; icono: Icono; detalle?: string }> = []
  if (resumen) {
    if (institucional) {
      indicadores.push({ etiqueta:'Familias beneficiarias', valor: resumen.indicadores.familias ?? 0, icono:UsersRound })
      indicadores.push({ etiqueta:'Huertos activos', valor:resumen.indicadores.huertosActivos ?? 0, icono:Sprout })
      indicadores.push({ etiqueta:'Ciclos activos', valor:resumen.indicadores.ciclosActivos ?? 0, icono:Leaf })
    }
    indicadores.push({ etiqueta:'Visitas realizadas', valor:resumen.indicadores.visitasRealizadas, icono:CheckCircle2, detalle:'Período' })
    indicadores.push({ etiqueta:'Capacitaciones', valor:resumen.indicadores.capacitaciones, icono:GraduationCap, detalle:'Período' })
    indicadores.push({ etiqueta:'Visitas vencidas', valor:resumen.indicadores.visitasVencidas, icono:AlertCircle })
  }
  let contenido: ReactNode = null
  if (cargando && !resumen) contenido = <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">Cargando indicadores...</div>
  else if (error) contenido = <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20">{error} <button type="button" onClick={actualizar} className="ml-2 font-semibold underline">Reintentar</button></div>
  else if (resumen) contenido = <>
    <div className={`grid grid-cols-2 gap-3 md:gap-5 ${institucional ? 'xl:grid-cols-3' : 'lg:grid-cols-3'}`}>
      {indicadores.map(item => <Indicador key={item.etiqueta} {...item} />)}
    </div>
    <div className={`grid gap-5 ${institucional ? 'xl:grid-cols-[minmax(0,1.6fr)_minmax(310px,1fr)]' : ''}`}>
      <GraficaActividad datos={resumen.actividadMensual}/>
      {institucional && <GraficaProgramas programas={resumen.programas}/>}
    </div>
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <Link to="/mi-agenda" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 font-medium text-brand-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-brand-300"><CalendarDays size={16}/> Mi agenda</Link>
    </div>
  </>
  return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
    <PageMeta title="Dashboard | Viviendas León" description="Indicadores de actividades y programas" />
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-white"><ChartNoAxesCombined size={25} className="text-brand-600"/> Dashboard</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{institucional ? 'Resumen institucional' : 'Mi actividad'}</p></div>
      <div className="flex items-center gap-2"><label htmlFor="dashboard-meses" className="sr-only">Período</label><select id="dashboard-meses" value={meses} onChange={event => setMeses(Number(event.target.value) as 3 | 6 | 12)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"><option value={3}>3 meses</option><option value={6}>6 meses</option><option value={12}>12 meses</option></select><button type="button" onClick={actualizar} aria-label="Actualizar indicadores" disabled={cargando} className="rounded-lg border border-gray-300 p-2.5 text-gray-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"><RefreshCw size={18}/></button></div>
    </div>
    {contenido}
  </main>
}
