import { useEffect, useState } from 'react'
import { CalendarClock, RefreshCw } from 'lucide-react'
import { emitirCambioNotificaciones, NOTIFICACIONES_ACTUALIZADAS } from '../services/notificationsService'
import { obtenerReprogramacionesPendientes, resolverReprogramacion, type SolicitudReprogramacionPendiente, type ResolverReprogramacion } from '../services/invitationsService'

const mostrarFecha = (valor: string) => new Intl.DateTimeFormat('es-GT', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
}).format(new Date(`${valor}T12:00:00Z`))

/** Solo las solicitudes autorizadas por la API; aceptar/denegar exige rol gestor. */
export default function SolicitudesReprogramacion() {
  const [solicitudes, setSolicitudes] = useState<SolicitudReprogramacionPendiente[]>([])
  const [revision, setRevision] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState<number | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setCargando(true); setError('')
    void obtenerReprogramacionesPendientes(controller.signal)
      .then(r => { if (!controller.signal.aborted) setSolicitudes(r.data) })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'No se pudieron cargar las solicitudes.') })
      .finally(() => { if (!controller.signal.aborted) setCargando(false) })
    return () => controller.abort()
  }, [revision])
  useEffect(() => {
    const actualizar = () => setRevision(v => v + 1)
    window.addEventListener(NOTIFICACIONES_ACTUALIZADAS, actualizar)
    return () => window.removeEventListener(NOTIFICACIONES_ACTUALIZADAS, actualizar)
  }, [])
  async function resolver(item: SolicitudReprogramacionPendiente, datos: ResolverReprogramacion) {
    if (procesando !== null) return
    setProcesando(item.id); setError('')
    try { await resolverReprogramacion(item.id, datos); emitirCambioNotificaciones() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo resolver la solicitud.') }
    finally { setProcesando(null) }
  }
  return <section aria-label="Solicitudes de reprogramación" className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:p-5">
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><CalendarClock size={18} className="text-brand-500"/> Reprogramaciones pendientes ({solicitudes.length})</h2>
      <button type="button" aria-label="Actualizar solicitudes" onClick={() => setRevision(n => n + 1)} disabled={cargando || procesando !== null} className="layout-focus rounded-lg border border-gray-200 p-2 text-gray-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"><RefreshCw size={16}/></button>
    </div>
    {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
    {cargando && <p role="status" className="text-sm text-gray-500">Cargando solicitudes…</p>}
    {!cargando && !solicitudes.length && !error && <p className="text-sm text-gray-500">Sin solicitudes pendientes.</p>}
    <ul className="space-y-3">{solicitudes.map(item => <li key={item.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
      <p className="font-semibold text-gray-900 dark:text-white">{item.eventoTitulo}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.solicitante} · {mostrarFecha(item.fechaVigente)}</p>
      <p className="mt-2 text-sm text-brand-700 dark:text-brand-300">Fecha solicitada: {mostrarFecha(item.fechaPropuesta)}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-300">Motivo: {item.motivo}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={procesando !== null} onClick={() => void resolver(item, { decision: 'ACEPTAR_FECHA' })} className="layout-focus rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Aprobar</button>
        <button type="button" disabled={procesando !== null} onClick={() => void resolver(item, { decision: 'MANTENER_FECHA', resolucion: 'SOLO_ORGANIZADOR' })} className="layout-focus rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200">Rechazar solicitud</button>
      </div>
      <p className="mt-2 text-xs text-gray-500">Si se rechaza, la fecha y la asignación original continúan vigentes.</p>
    </li>)}</ul>
  </section>
}
