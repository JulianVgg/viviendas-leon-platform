import { useEffect, useState } from 'react'
import { CalendarClock, RefreshCw } from 'lucide-react'
import { loadParticipants, type CalendarPerson } from '@/features/calendar/services/calendarService'
import { emitirCambioNotificaciones, NOTIFICACIONES_ACTUALIZADAS } from '../services/notificationsService'
import {
  obtenerParticipantesInvitacion, obtenerReprogramacionesPendientes, resolverReprogramacion,
  type SolicitudReprogramacionPendiente, type ResolverReprogramacion,
} from '../services/invitationsService'

function mostrarFecha(valor: string): string {
  return new Intl.DateTimeFormat('es-GT', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${valor}T12:00:00Z`))
}

/** Solo muestra las solicitudes que la API reconoce como creadas por el organizador. */
export default function SolicitudesReprogramacion() {
  const [solicitudes, setSolicitudes] = useState<SolicitudReprogramacionPendiente[]>([])
  const [revision, setRevision] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [procesando, setProcesando] = useState<number | null>(null)
  const [editando, setEditando] = useState<number | null>(null)
  const [alternativa, setAlternativa] = useState<'SOLO_ORGANIZADOR' | 'OTRA_PERSONA'>('SOLO_ORGANIZADOR')
  const [reemplazo, setReemplazo] = useState('')
  const [usuarios, setUsuarios] = useState<CalendarPerson[]>([])
  const [ocupados, setOcupados] = useState<number[]>([])
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setCargando(true)
    setError('')
    void obtenerReprogramacionesPendientes(controller.signal)
      .then(r => { if (!controller.signal.aborted) setSolicitudes(r.data) })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Error consultando solicitudes.') })
      .finally(() => { if (!controller.signal.aborted) setCargando(false) })
    return () => controller.abort()
  }, [revision])

  useEffect(() => {
    const actualizar = () => setRevision(actual => actual + 1)
    window.addEventListener(NOTIFICACIONES_ACTUALIZADAS, actualizar)
    return () => window.removeEventListener(NOTIFICACIONES_ACTUALIZADAS, actualizar)
  }, [])

  async function prepararReemplazos(item: SolicitudReprogramacionPendiente) {
    setAlternativa('OTRA_PERSONA')
    setReemplazo('')
    setCargandoUsuarios(true)
    setError('')
    try {
      const [personas, participantes] = await Promise.all([
        loadParticipants(), obtenerParticipantesInvitacion(item.eventoId),
      ])
      setUsuarios(personas)
      setOcupados(participantes.data.map(p => p.usuarioId).concat(item.solicitanteId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible consultar a los participantes disponibles.')
      setAlternativa('SOLO_ORGANIZADOR')
    } finally { setCargandoUsuarios(false) }
  }

  async function resolver(item: SolicitudReprogramacionPendiente, datos: ResolverReprogramacion) {
    if (procesando !== null || cargandoUsuarios) return
    setProcesando(item.id)
    setError('')
    try {
      await resolverReprogramacion(item.id, datos)
      setEditando(null)
      setReemplazo('')
      emitirCambioNotificaciones()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo resolver la solicitud.')
    } finally { setProcesando(null) }
  }

  const disponibles = usuarios.filter(p => !ocupados.includes(p.id))
  return <section aria-label="Solicitudes de reprogramación" className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:p-5">
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        <CalendarClock size={18} className="text-brand-500" /> Reprogramaciones pendientes ({solicitudes.length})
      </h2>
      <button type="button" aria-label="Actualizar solicitudes" disabled={cargando || procesando !== null} onClick={() => setRevision(v => v + 1)}
        className="layout-focus rounded-lg border border-gray-200 p-2 text-gray-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300">
        <RefreshCw size={15} />
      </button>
    </div>
    <p className="mb-3 text-xs leading-5 text-gray-500 dark:text-gray-400">Revisa las propuestas de las actividades que organizaste.</p>
    {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
    {cargando && <p role="status" className="text-sm text-gray-500">Cargando solicitudes...</p>}
    {!cargando && solicitudes.length === 0 && !error && <p className="text-sm text-gray-500 dark:text-gray-400">No tienes propuestas pendientes.</p>}
    <ul className="space-y-3">
      {solicitudes.map(item => <li key={item.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
        <p className="break-words text-sm font-semibold text-gray-900 dark:text-white">{item.eventoTitulo}</p>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">Solicita: {item.solicitante}</p>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">Fecha actual: {mostrarFecha(item.fechaVigente)}</p>
        <p className="mt-1 text-sm font-medium text-brand-700 dark:text-brand-300">Propone: {mostrarFecha(item.fechaPropuesta)}</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-xs text-gray-600 dark:text-gray-300">Motivo: {item.motivo}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={procesando !== null || cargando} onClick={() => void resolver(item, { decision: 'ACEPTAR_FECHA' })}
            className="layout-focus rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">
            {procesando === item.id ? 'Guardando...' : 'Aceptar nueva fecha'}
          </button>
          <button type="button" disabled={procesando !== null || cargando} onClick={() => {
            setEditando(actual => actual === item.id ? null : item.id)
            setAlternativa('SOLO_ORGANIZADOR')
            setReemplazo('')
          }} className="layout-focus rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200">
            Mantener fecha original
          </button>
        </div>
        {editando === item.id && <div className="mt-3 space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">¿Quién reemplazará al participante?</p>
          <label className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-200">
            <input type="radio" name={`alternativa-${item.id}`} checked={alternativa === 'SOLO_ORGANIZADOR'}
              onChange={() => { setAlternativa('SOLO_ORGANIZADOR'); setReemplazo('') }} />
            Continuar sin este participante, sin asignar reemplazo
          </label>
          <label className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-200">
            <input type="radio" name={`alternativa-${item.id}`} checked={alternativa === 'OTRA_PERSONA'}
              onChange={() => void prepararReemplazos(item)} />
            Invitar a otra persona
          </label>
          {alternativa === 'OTRA_PERSONA' && <>
            <label htmlFor={`reemplazo-${item.id}`} className="block text-xs font-medium text-gray-700 dark:text-gray-300">Seleccionar reemplazo</label>
            <select id={`reemplazo-${item.id}`} value={reemplazo} disabled={cargandoUsuarios} onChange={e => setReemplazo(e.target.value)}
              className="layout-focus min-h-10 w-full rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200">
              <option value="">{cargandoUsuarios ? 'Cargando personas...' : 'Selecciona una persona'}</option>
              {disponibles.map(persona => <option key={persona.id} value={persona.id}>{persona.nombre}</option>)}
            </select>
            {!cargandoUsuarios && disponibles.length === 0 && <p className="text-xs text-gray-500">No hay candidatos disponibles para reemplazo.</p>}
          </>}
          <p className="text-xs text-gray-500 dark:text-gray-400">Se notificará al solicitante que la actividad se mantiene en su fecha original.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditando(null)} disabled={procesando !== null}
              className="layout-focus rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-600 dark:text-gray-200">Cancelar</button>
            <button type="button" disabled={procesando !== null || cargandoUsuarios || (alternativa === 'OTRA_PERSONA' && !reemplazo)}
              onClick={() => void resolver(item, alternativa === 'SOLO_ORGANIZADOR'
                ? { decision: 'MANTENER_FECHA', resolucion: 'SOLO_ORGANIZADOR' }
                : { decision: 'MANTENER_FECHA', resolucion: 'OTRA_PERSONA', reemplazoUsuarioId: Number(reemplazo) })}
              className="layout-focus rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">
              Confirmar decisión
            </button>
          </div>
        </div>}
      </li>)}
    </ul>
  </section>
}
