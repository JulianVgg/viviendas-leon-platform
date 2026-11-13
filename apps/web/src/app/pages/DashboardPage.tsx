import { useCallback, useEffect, useState, useRef, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { AlertCircle, ArrowUpRight, CalendarDays, Filter, RotateCcw, CheckCircle2, GraduationCap, Leaf, RefreshCw, Sprout, UsersRound } from 'lucide-react'
import PageMeta from '@/components/common/PageMeta'
import { useAuth } from '@/features/auth/AuthProvider'
import { consultarDashboard, consultarFamiliasProgramas, consultarIndicadoresVisitasCapacitaciones, consultarIndicadoresAgricolas, consultarOpcionesFiltrosDashboard, type OpcionesFiltrosDashboard, type IndicadoresAgricolas, type ResumenDashboard, type ResumenFamiliasProgramas, type IndicadoresVisitasCapacitaciones } from '@/features/dashboard/services/dashboardSummaryService'
import FamiliasProgramasPanel from '@/features/dashboard/pages/FamiliasProgramasPanel'
import VisitasCapacitacionesPanel from '@/features/dashboard/pages/VisitasCapacitacionesPanel'
import AgriculturaProduccionPanel from '@/features/dashboard/pages/AgriculturaProduccionPanel'
import { ProAreaChart } from '@/features/dashboard/charts/TailAdminCharts'
import { seriesActividad } from '@/features/dashboard/lib/chartSeries'
import type { FiltrosDashboard } from '@/features/dashboard/lib/dashboardFilters'
import { guardarRetornoDashboard, obtenerRetornoDashboard, consumirPosicionDashboard } from '@/features/dashboard/lib/dashboardReturn'
import { canViewPath } from '@/features/auth/screenPermissions'
import { formatoFechaHoraGuatemala, saludoGuatemala } from '@/features/dashboard/lib/guatemalaDateTime'

const tarjeta = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900'
type Icono = typeof UsersRound

function Indicador({ etiqueta, valor, icono: Icono, onClick, disabled }: { etiqueta: string; valor: number; icono: Icono; onClick: () => void; disabled: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={`Ir al módulo de ${etiqueta}`}
    className={`${tarjeta} group w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60`}>
    <span className="flex items-start justify-between gap-2">
      <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Icono size={20} strokeWidth={1.7}/></span>
      <ArrowUpRight size={17} className="text-gray-400 transition-colors group-hover:text-brand-600" aria-hidden="true"/>
    </span>
    <span className="mt-5 block text-3xl font-semibold tracking-tight tabular-nums text-gray-900 dark:text-white">{valor.toLocaleString('es-GT')}</span>
    <span className="mt-2 block text-sm text-gray-500 dark:text-gray-400">{etiqueta}</span>
  </button>
}


function GraficaActividad({ datos }: { datos: ResumenDashboard['actividadMensual'] }) {
  const { labels, series } = seriesActividad(datos)
  const sinActividad = datos.every(dato => dato.visitas === 0 && dato.capacitaciones === 0)
  return <section className={tarjeta} aria-label="Actividad mensual">
    <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">Actividad por mes</h2>
    {sinActividad
      ? <p className="py-20 text-center text-sm text-gray-500">Sin actividad en este período.</p>
      : <ProAreaChart labels={labels} series={series} ariaLabel="Visitas realizadas y capacitaciones por mes" height={300}/>}
  </section>
}

export default function DashboardPage() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const nombreUsuario = usuario?.nombre.trim()
  const anterior = obtenerRetornoDashboard(usuario?.id)
  const [ahora, setAhora] = useState(() => new Date())
  const posicionRegreso = useRef<number | null | undefined>(undefined)
  const scrollRestaurado = useRef(false)
  const [meses, setMeses] = useState<3 | 6 | 12>(() => anterior?.meses ?? 6)
  const [actualizacion, setActualizacion] = useState(0)
  const [comunidadId, setComunidadId] = useState<number | undefined>(() => anterior?.comunidadId)
  const [responsableId, setResponsableId] = useState<number | undefined>(() => anterior?.responsableId)
  const [opciones, setOpciones] = useState<OpcionesFiltrosDashboard | null>(() => anterior?.opciones ?? null)
  const [errorOpciones, setErrorOpciones] = useState(false)
  const [resumen, setResumen] = useState<ResumenDashboard | null>(() => anterior?.resumen ?? null)
  const [cargando, setCargando] = useState(true)
  const [familiasProgramas, setFamiliasProgramas] = useState<ResumenFamiliasProgramas | null>(() => anterior?.familiasProgramas ?? null)
  const [errorFamilias, setErrorFamilias] = useState('')
  const [error, setError] = useState('')
  const [indicadoresOperativos, setIndicadoresOperativos] = useState<IndicadoresVisitasCapacitaciones | null>(() => anterior?.indicadoresOperativos ?? null)
  const [errorOperativos, setErrorOperativos] = useState('')
  const [agricultura, setAgricultura] = useState<IndicadoresAgricolas|null>(() => anterior?.agricultura ?? null)
  const [errorAgricultura, setErrorAgricultura] = useState('')
  const filtros: FiltrosDashboard = { comunidadId, responsableId }
  const restablecer = () => { setMeses(6); setComunidadId(undefined); setResponsableId(undefined) }
  const actualizar = useCallback(() => setActualizacion(v => v + 1), [])
  useEffect(() => {
    const intervalo = window.setInterval(() => setAhora(new Date()), 1_000)
    return () => window.clearInterval(intervalo)
  }, [])
  // Al regresar de un módulo no saltamos al encabezado ni volvemos a mostrar las tarjetas vacías.
  useEffect(() => {
    if (!resumen || scrollRestaurado.current) return
    if (posicionRegreso.current === undefined) posicionRegreso.current = consumirPosicionDashboard(usuario?.id)
    const posicion = posicionRegreso.current
    if (posicion === null || posicion === undefined) return
    const primero = window.setTimeout(() => window.scrollTo({ top: posicion, behavior: 'instant' }), 40)
    const segundo = window.setTimeout(() => {
      window.scrollTo({ top: posicion, behavior: 'instant' })
      scrollRestaurado.current = true
    }, 220)
    return () => { window.clearTimeout(primero); window.clearTimeout(segundo) }
  }, [resumen, usuario?.id])

  const recordarPosicion = () => {
    if (!usuario) return
    guardarRetornoDashboard({
      userId: usuario.id, scrollY: window.scrollY, meses, comunidadId, responsableId,
      resumen, familiasProgramas, indicadoresOperativos, agricultura, opciones,
    })
  }
  const abrirModulo = (ruta: string) => {
    if (!usuario || !canViewPath(usuario, ruta.split('?')[0])) return
    recordarPosicion()
    navigate(ruta)
  }
  useEffect(() => {
    const controller = new AbortController()
    setCargando(true); setError('')
    void consultarDashboard(meses, controller.signal, filtros).then(data => {
      if (!controller.signal.aborted) setResumen(data)
    }).catch(() => {
      if (!controller.signal.aborted) setError('No se pudieron cargar los indicadores.')
    }).finally(() => { if (!controller.signal.aborted) setCargando(false) })
    return () => controller.abort()
  }, [meses, comunidadId, responsableId, actualizacion])

  // MON-02 es exclusivamente institucional; no se consulta desde cuentas técnicas.
  useEffect(() => {
    if (resumen?.alcance !== 'INSTITUCIONAL') return
    const controller = new AbortController()
    setErrorFamilias('')
    void consultarFamiliasProgramas(controller.signal, filtros).then(datos => {
      if (!controller.signal.aborted) setFamiliasProgramas(datos)
    }).catch(() => {
      if (!controller.signal.aborted) setErrorFamilias('No se pudieron cargar los programas.')
    })
    return () => controller.abort()
  }, [resumen?.alcance, comunidadId, responsableId, actualizacion])

  useEffect(() => {
    const controller = new AbortController()
    setErrorOperativos(''); setIndicadoresOperativos(null)
    void consultarIndicadoresVisitasCapacitaciones(meses, controller.signal, filtros).then(data => {
      if (!controller.signal.aborted) setIndicadoresOperativos(data)
    }).catch(() => { if (!controller.signal.aborted) setErrorOperativos('No se pudieron cargar las actividades.') })
    return () => controller.abort()
  }, [meses, comunidadId, responsableId, actualizacion])

  // No solicitar información agrícola institucional desde cuentas operativas.
  useEffect(() => {
    if (resumen?.alcance !== 'INSTITUCIONAL') { setAgricultura(null); return }
    const controller = new AbortController()
    setErrorAgricultura(''); setAgricultura(null)
    void consultarIndicadoresAgricolas(meses, controller.signal, filtros).then(data => {
      if (!controller.signal.aborted) setAgricultura(data)
    }).catch(() => { if (!controller.signal.aborted) setErrorAgricultura('No se pudieron cargar los indicadores agrícolas.') })
    return () => controller.abort()
  }, [resumen?.alcance, meses, comunidadId, responsableId, actualizacion])

  useEffect(() => {
    if (resumen?.alcance !== 'INSTITUCIONAL') { setOpciones(null); return }
    const controller = new AbortController()
    setErrorOpciones(false)
    void consultarOpcionesFiltrosDashboard(controller.signal).then(data => {
      if (!controller.signal.aborted) setOpciones(data)
    }).catch(() => { if (!controller.signal.aborted) setErrorOpciones(true) })
    return () => controller.abort()
  }, [resumen?.alcance, actualizacion])


  const institucional = resumen?.alcance === 'INSTITUCIONAL'
  const indicadores: Array<{ etiqueta: string; valor: number; icono: Icono; ruta: string }> = []
  if (resumen) {
    if (institucional) {
      indicadores.push({ etiqueta:'Familias beneficiarias', valor: resumen.indicadores.familias ?? 0, icono:UsersRound, ruta:'/familias' })
      indicadores.push({ etiqueta:'Huertos activos', valor:resumen.indicadores.huertosActivos ?? 0, icono:Sprout, ruta:'/gestion-agricola/huertos' })
      indicadores.push({ etiqueta:'Ciclos activos', valor:resumen.indicadores.ciclosActivos ?? 0, icono:Leaf, ruta:'/gestion-agricola/ciclos' })
    }
    indicadores.push({ etiqueta:'Visitas realizadas', valor:resumen.indicadores.visitasRealizadas, icono:CheckCircle2, ruta:'/visitas/historial' })
    indicadores.push({ etiqueta:'Capacitaciones', valor:resumen.indicadores.capacitaciones, icono:GraduationCap, ruta:'/actividades/capacitaciones/historial' })
    indicadores.push({ etiqueta:'Visitas vencidas', valor:resumen.indicadores.visitasVencidas, icono:AlertCircle, ruta:institucional ? '/reportes/alertas' : '/visitas/agenda' })
  }
  let contenido: ReactNode = null
  if (cargando && !resumen) contenido = <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">Cargando indicadores...</div>
  else if (error) contenido = <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20">{error} <button type="button" onClick={actualizar} className="ml-2 font-semibold underline">Reintentar</button></div>
  else if (resumen) contenido = <>
    <div className={`grid grid-cols-2 gap-3 md:gap-5 ${institucional ? 'xl:grid-cols-3' : 'lg:grid-cols-3'}`}>
      {indicadores.map(item => <Indicador key={item.etiqueta} etiqueta={item.etiqueta} valor={item.valor} icono={item.icono} onClick={() => abrirModulo(item.ruta)} disabled={!usuario || !canViewPath(usuario, item.ruta)} />)}
    </div>
    <GraficaActividad datos={resumen.actividadMensual}/>
    {indicadoresOperativos && <VisitasCapacitacionesPanel datos={indicadoresOperativos} alNavegar={abrirModulo} puedeAbrir={ruta => Boolean(usuario && canViewPath(usuario, ruta))} />}
    {errorOperativos && <p role="alert" className="text-sm text-rose-600">{errorOperativos}</p>}
    {institucional && familiasProgramas && <FamiliasProgramasPanel datos={familiasProgramas} />}
    {institucional && agricultura && <AgriculturaProduccionPanel datos={agricultura} meses={meses} filtros={filtros} alSalir={recordarPosicion}/>}
    {institucional && errorAgricultura && <p role="alert" className="text-sm text-rose-600">{errorAgricultura}</p>}
    {institucional && !familiasProgramas && !errorFamilias && <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">Cargando participación...</div>}
    {institucional && errorFamilias && <p role="alert" className="text-sm text-rose-600">{errorFamilias}</p>}
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <Link to="/mi-agenda" onClick={recordarPosicion} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 font-medium text-brand-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-brand-300"><CalendarDays size={16}/> Mi agenda</Link>
    </div>
  </>
  return <main className={`${anterior ? "" : "dashboard-page-enter"} mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6`}>
    <PageMeta title="Inicio | Viviendas León" description="Indicadores de actividades y programas" />
    <section aria-label="Bienvenida" className={`${anterior ? "" : "dashboard-welcome-enter"} dashboard-welcome-card relative isolate overflow-hidden rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:px-8 sm:py-7`}>
      <div className="relative z-10">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          {saludoGuatemala(ahora)}{nombreUsuario ? <>{', '}<span className="text-brand-600 dark:text-brand-300">{nombreUsuario}</span></> : null}
        </h1>
        <p className="mt-2 text-sm font-medium capitalize text-gray-500 dark:text-gray-400" aria-label="Fecha y hora actual de Guatemala">{formatoFechaHoraGuatemala(ahora)} · Hora de Guatemala</p>
      </div>
    </section>
    <div className="flex flex-wrap items-center justify-end gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {institucional && <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400"><Filter size={15}/> Filtros</span>}
        <label htmlFor="dashboard-meses" className="sr-only">Período</label>
        <select id="dashboard-meses" value={meses} onChange={event => setMeses(Number(event.target.value) as 3 | 6 | 12)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"><option value={3}>3 meses</option><option value={6}>6 meses</option><option value={12}>12 meses</option></select>
        {institucional && <>
          <label htmlFor="dashboard-comunidad" className="sr-only">Comunidad</label>
          <select id="dashboard-comunidad" value={comunidadId ?? ''} onChange={event => setComunidadId(event.target.value ? Number(event.target.value) : undefined)} disabled={!opciones}
            className="max-w-48 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            <option value="">Todas las comunidades</option>
            {opciones?.comunidades.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <label htmlFor="dashboard-responsable" className="sr-only">Responsable (solo actividades)</label>
          <select id="dashboard-responsable" value={responsableId ?? ''} onChange={event => setResponsableId(event.target.value ? Number(event.target.value) : undefined)} disabled={!opciones}
            title="Solo filtra visitas y capacitaciones" className="max-w-48 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            <option value="">Todos los responsables</option>
            {opciones?.responsables.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </>}
        <button type="button" onClick={restablecer} disabled={meses === 6 && !comunidadId && !responsableId} aria-label="Restablecer filtros" title="Restablecer filtros"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"><RotateCcw size={16}/> Limpiar</button>
        <button type="button" onClick={actualizar} aria-label="Actualizar indicadores" disabled={cargando} title="Actualizar indicadores" className="rounded-lg border border-gray-300 p-2.5 text-gray-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"><RefreshCw size={18}/></button>
      </div>
    </div>
    {institucional && errorOpciones && <p role="status" className="-mt-2 text-xs text-amber-600">No se pudieron cargar las opciones de filtros.</p>}
    <div className={`${anterior ? "" : "dashboard-content-enter"} space-y-6`}>{contenido}</div>
  </main>
}
