import { useEffect, useState } from 'react'
import { BarChart3, RefreshCw } from 'lucide-react'
import { NOTIFICACIONES_ACTUALIZADAS } from '../services/notificationsService'
import { obtenerResumenInvitaciones, type ResumenInvitacion } from '../services/invitationsService'

const nombres: Record<string, string> = { ACEPTADA: 'Aceptó', PENDIENTE: 'Pendiente', RECHAZADA: 'Rechazó', ASIGNADO: 'Asignado' }
const clases: Record<string, string> = {
  ACEPTADA: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  PENDIENTE: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  RECHAZADA: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
}

export default function SeguimientoInvitaciones() {
  const [eventos, setEventos] = useState<ResumenInvitacion[]>([])
  const [elegido, setElegido] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    setCargando(true)
    setError('')
    void obtenerResumenInvitaciones(controlador.signal)
      .then(result => {
        if (controlador.signal.aborted) return
        setEventos(result.data)
        setElegido(actual => result.data.some(e => e.eventoId === actual) ? actual : result.data[0]?.eventoId ?? null)
      })
      .catch(cause => { if (!controlador.signal.aborted) setError(cause instanceof Error ? cause.message : 'Error cargando invitaciones.') })
      .finally(() => { if (!controlador.signal.aborted) setCargando(false) })
    return () => controlador.abort()
  }, [revision])

  useEffect(() => {
    const actualizar = () => setRevision(valor => valor + 1)
    window.addEventListener(NOTIFICACIONES_ACTUALIZADAS, actualizar)
    return () => window.removeEventListener(NOTIFICACIONES_ACTUALIZADAS, actualizar)
  }, [])

  const evento = eventos.find(e => e.eventoId === elegido)
  return <aside aria-label="Seguimiento de invitaciones" className="self-start rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:p-5">
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><BarChart3 size={18} className="text-brand-500" /> Seguimiento de respuestas</h2>
      <button type="button" aria-label="Actualizar seguimiento" disabled={cargando} onClick={() => setRevision(valor => valor + 1)} className="layout-focus rounded-lg border border-gray-200 p-2 text-gray-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"><RefreshCw size={15} /></button>
    </div>
    <p className="mb-4 text-xs leading-5 text-gray-500 dark:text-gray-400">Consulta los estados de cada invitación institucional.</p>
    {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
    <label htmlFor="invitation-selector" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">Seleccionar invitación</label>
    <select id="invitation-selector" value={elegido ?? ''} disabled={!eventos.length} onChange={e => setElegido(Number(e.target.value))}
      className="layout-focus mb-4 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
      {eventos.length === 0 && <option value="">Sin invitaciones</option>}
      {eventos.map(item => <option key={item.eventoId} value={item.eventoId}>{item.titulo} · {item.fechaInicio}</option>)}
    </select>
    {cargando && !eventos.length && <p role="status" className="text-sm text-gray-500">Cargando invitaciones...</p>}
    {evento && <>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-emerald-50 p-2.5 text-center dark:bg-emerald-500/10"><p className="text-xl font-semibold text-emerald-700 dark:text-emerald-300">{evento.aceptaron}</p><p className="text-xs text-emerald-800 dark:text-emerald-200">Aceptaron</p></div>
        <div className="rounded-lg bg-amber-50 p-2.5 text-center dark:bg-amber-500/10"><p className="text-xl font-semibold text-amber-700 dark:text-amber-300">{evento.pendientes}</p><p className="text-xs text-amber-800 dark:text-amber-200">Pendientes</p></div>
        <div className="rounded-lg bg-red-50 p-2.5 text-center dark:bg-red-500/10"><p className="text-xl font-semibold text-red-700 dark:text-red-300">{evento.rechazaron}</p><p className="text-xs text-red-800 dark:text-red-200">Rechazaron</p></div>
      </div>
      <p className="mt-5 mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">Participantes ({evento.invitados})</p>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {evento.participantes.map(persona => <li key={persona.usuarioId} className="flex items-center justify-between gap-2 py-3">
          <span className="min-w-0 truncate text-xs font-medium text-gray-700 dark:text-gray-200" title={persona.nombre}>{persona.nombre}</span>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${clases[persona.estado] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-200'}`}>
            {nombres[persona.estado] ?? persona.estado}
          </span>
        </li>)}
      </ul>
    </>}
    {!cargando && !evento && !error && <p className="text-sm text-gray-500">Todavía no se han enviado invitaciones.</p>}
  </aside>
}
