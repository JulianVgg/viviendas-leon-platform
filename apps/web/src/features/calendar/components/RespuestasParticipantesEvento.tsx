import { useEffect, useState } from 'react'
import { RefreshCw, UsersRound } from 'lucide-react'
import { obtenerParticipantesInvitacion, type ParticipanteRespuesta } from '@/features/notifications/services/invitationsService'

const etiquetas: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADA: 'Confirmada',
  RECHAZADA: 'Rechazada',
  ASIGNADO: 'Asignación anterior',
}
const estilos: Record<string, string> = {
  PENDIENTE: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
  ACEPTADA: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300',
  RECHAZADA: 'bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300',
  ASIGNADO: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

/** Vista informativa: las respuestas solo se consultan, nunca se editan desde aquí. */
export default function RespuestasParticipantesEvento({ eventoId }: { eventoId: number }) {
  const [personas, setPersonas] = useState<ParticipanteRespuesta[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setPersonas([])
    setCargando(true)
    setError('')
    void obtenerParticipantesInvitacion(eventoId, controller.signal)
      .then(resultado => { if (!controller.signal.aborted) setPersonas(resultado.data) })
      .catch(causa => {
        if (!controller.signal.aborted) setError(causa instanceof Error ? causa.message : 'No se pudieron cargar las respuestas.')
      })
      .finally(() => { if (!controller.signal.aborted) setCargando(false) })
    return () => controller.abort()
  }, [eventoId, revision])

  const aceptaron = personas.filter(p => p.estado === 'ACEPTADA').length
  const pendientes = personas.filter(p => p.estado === 'PENDIENTE').length
  const rechazaron = personas.filter(p => p.estado === 'RECHAZADA').length

  return <section aria-label="Confirmaciones del evento" className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
        <UsersRound size={17} className="text-brand-500" /> Confirmaciones de asistencia
      </h3>
      <button type="button" onClick={() => setRevision(n => n + 1)} disabled={cargando}
        className="layout-focus inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300">
        <RefreshCw size={14} /> Actualizar
      </button>
    </div>
    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
      {aceptaron} confirmadas · {pendientes} pendientes · {rechazaron} rechazadas
    </p>
    {cargando && <p role="status" className="mt-3 text-xs text-gray-500">Cargando respuestas...</p>}
    {error && <p role="alert" className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}
    {!error && !cargando && personas.length === 0 && <p className="mt-3 text-xs text-gray-500">Este evento no tiene participantes asignados.</p>}
    {!error && <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
      {personas.map(persona => <li key={persona.usuarioId} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
        <span className="min-w-0 break-words text-sm text-gray-700 dark:text-gray-200">{persona.nombre}</span>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${estilos[persona.estado] ?? estilos.ASIGNADO}`}>
          {etiquetas[persona.estado] ?? persona.estado}
        </span>
      </li>)}
    </ul>}
  </section>
}
