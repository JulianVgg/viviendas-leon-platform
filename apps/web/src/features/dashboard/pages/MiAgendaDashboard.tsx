import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { CalendarDays, CheckSquare2, ChevronRight, Clock3, ClipboardList, RefreshCw, AlertCircle, CalendarCheck2 } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath } from '@/features/auth/screenPermissions'
import { consultarMiAgenda, type AgendaItem, type MiAgendaResponse } from '../services/myAgendaService'

const estiloTarjeta = 'rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:p-5'

function fechaCorta(fecha: string | null, hoy: string) {
  if (!fecha) return 'Sin fecha límite'
  if (fecha === hoy) return 'Hoy'
  const [year, month, day] = fecha.split('-').map(Number)
  return new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day, 12)))
}

function AgendaFila({ item, hoy }: { item: AgendaItem; hoy: string }) {
  const icono = item.tipo === 'EVENTO' ? <CalendarDays size={18} /> : item.tipo === 'VISITA' ? <CalendarCheck2 size={18} /> : <ClipboardList size={18} />
  return <li>
    <Link to={item.destino} className="layout-focus group flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">{icono}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-gray-800 dark:text-white/90" title={item.titulo}>{item.titulo}</span>
        <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{item.detalle}</span>
        <span className={`mt-1 block text-xs ${item.estado === 'VENCIDA' ? 'font-medium text-error-500' : 'text-gray-500 dark:text-gray-400'}`}>
          {fechaCorta(item.fecha, hoy)}{item.fechaFin && item.fechaFin !== item.fecha ? ` · Hasta ${fechaCorta(item.fechaFin, hoy)}` : ''}
          {item.estado === 'VENCIDA' ? ' · Vencida' : ''}
        </span>
      </span>
      <ChevronRight size={17} className="shrink-0 text-gray-400 group-hover:text-brand-500" />
    </Link>
  </li>
}

function SeccionAgenda({ titulo, descripcion, items, hoy, vacio, icono }: {
  titulo: string; descripcion: string; items: AgendaItem[]; hoy: string; vacio: string; icono: React.ReactNode
}) {
  return <section className={estiloTarjeta}>
    <div className="mb-3 flex items-start gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
      <span className="mt-0.5 text-brand-500">{icono}</span>
      <div className="min-w-0"><h2 className="text-base font-semibold text-gray-800 dark:text-white/90">{titulo}</h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{descripcion}</p></div>
    </div>
    {items.length ? <ul className="divide-y divide-gray-100 dark:divide-gray-800">{items.map(item => <AgendaFila key={item.id} item={item} hoy={hoy} />)}</ul> :
      <div className="flex min-h-28 flex-col items-center justify-center gap-2 text-center text-sm text-gray-500 dark:text-gray-400">
        <CalendarCheck2 size={22} className="text-gray-400" /><span>{vacio}</span>
      </div>}
  </section>
}

export default function MiAgendaDashboard() {
  const { usuario } = useAuth()
  const [agenda, setAgenda] = useState<MiAgendaResponse | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const refrescar = useCallback(() => setRevision(n => n + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setCargando(true)
    setError('')
    setAgenda(null)
    void consultarMiAgenda(controller.signal).then(data => {
      if (!controller.signal.aborted) setAgenda(data)
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Error de conexión.')
    }).finally(() => { if (!controller.signal.aborted) setCargando(false) })
    return () => controller.abort()
  }, [usuario?.id, revision])

  useEffect(() => {
    const actualizar = () => { if (document.visibilityState === 'visible') refrescar() }
    window.addEventListener('focus', actualizar)
    return () => window.removeEventListener('focus', actualizar)
  }, [refrescar])

  const estadisticas = agenda ? [
    { titulo: 'Actividades de hoy', valor: agenda.indicadores.actividadesHoy, icono: <CalendarDays size={19} /> },
    { titulo: 'Próximas actividades', valor: agenda.indicadores.proximasActividades, icono: <Clock3 size={19} /> },
    { titulo: 'Visitas programadas', valor: agenda.indicadores.visitasProgramadas, icono: <CalendarCheck2 size={19} /> },
    { titulo: 'Compromisos pendientes', valor: agenda.indicadores.compromisosPendientes, icono: <CheckSquare2 size={19} /> },
  ] : []

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Mi agenda</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Tus actividades, visitas y compromisos asignados.</p></div>
      <button type="button" onClick={refrescar} disabled={cargando} className="layout-focus inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 px-3 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800" aria-label="Actualizar mi agenda">
        <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />Actualizar
      </button>
    </div>
    {cargando && <div role="status" className={`${estiloTarjeta} flex min-h-52 items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400`}><RefreshCw size={18} className="animate-spin" />Cargando actividades...</div>}
    {!cargando && error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-600 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400"><AlertCircle size={18}/>{error}<button type="button" onClick={refrescar} className="layout-focus underline">Reintentar</button></div>}
    {!cargando && agenda && <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{estadisticas.map(indicador => <div key={indicador.titulo} className={estiloTarjeta}>
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">{indicador.icono}<span className="text-xs sm:text-sm">{indicador.titulo}</span></div>
        <p className="mt-4 text-2xl font-semibold tabular-nums text-gray-800 dark:text-white/90">{indicador.valor}</p>
      </div>)}</div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SeccionAgenda titulo="Mis actividades de hoy" descripcion="Eventos y visitas para el día de hoy" items={agenda.hoy} hoy={agenda.fechaHoy} vacio="No tienes actividades programadas hoy." icono={<CalendarDays size={20}/>}/>
        <SeccionAgenda titulo="Próximas actividades" descripcion="Planificación de los siguientes 30 días" items={agenda.proximas} hoy={agenda.fechaHoy} vacio="No tienes próximas actividades." icono={<Clock3 size={20}/>}/>
        <SeccionAgenda titulo="Mis pendientes" descripcion="Compromisos y visitas vencidas" items={agenda.pendientes} hoy={agenda.fechaHoy} vacio="No tienes compromisos o visitas vencidas." icono={<ClipboardList size={20}/>}/>
      </div>
      {agenda.supervision && usuario && canViewPath(usuario, '/visitas/agenda') &&
        <section className={estiloTarjeta} aria-label="Supervisión de visitas vencidas">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <AlertCircle size={22} className="text-warning-500" />
              <div><h2 className="font-semibold text-gray-800 dark:text-white/90">Visitas vencidas del equipo</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Dirección y Coordinación · Visitas programadas de fechas anteriores aún no realizadas</p></div>
            </div>
            <span className="rounded-lg bg-warning-50 px-3 py-1.5 text-xl font-semibold tabular-nums text-warning-700 dark:bg-warning-500/10 dark:text-warning-400" aria-label={`${agenda.supervision.visitasVencidas} visitas vencidas`}>
              {agenda.supervision.visitasVencidas}
            </span>
          </div>
          {agenda.supervision.visitas.length ? <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {agenda.supervision.visitas.map(visita => <li key={visita.id}>
              <Link to={visita.destino} className="layout-focus flex items-center gap-3 rounded-lg px-2 py-3 text-sm hover:bg-gray-50 dark:hover:bg-white/[0.04]">
                <CalendarCheck2 size={18} className="shrink-0 text-warning-500" />
                <span className="min-w-0 flex-1"><span className="block truncate font-medium text-gray-800 dark:text-white/90">{visita.familia}</span>
                  <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{visita.comunidad} · {visita.tecnico} · {fechaCorta(visita.fecha, agenda.fechaHoy)}</span>
                </span><ChevronRight size={17} className="shrink-0 text-gray-400" />
              </Link>
            </li>)}
          </ul> : <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">No hay visitas vencidas por supervisar.</p>}
          {agenda.supervision.visitasVencidas > agenda.supervision.visitas.length && <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Se muestran las primeras 12 visitas vencidas. Abre la agenda para consultar todas.</p>}
        </section>}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {usuario && agenda.modulos.calendario && canViewPath(usuario, '/calendario') && <Link to="/calendario" className="layout-focus font-medium text-brand-600 hover:underline dark:text-brand-400">Abrir calendario institucional →</Link>}
        {usuario && agenda.modulos.visitas && canViewPath(usuario, '/visitas/agenda') && <Link to="/visitas/agenda" className="layout-focus font-medium text-brand-600 hover:underline dark:text-brand-400">Abrir agenda de visitas →</Link>}
      </div>
    </>}
  </div>
}
