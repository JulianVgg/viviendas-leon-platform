import { useEffect, useState } from 'react'
import { CalendarDays, Clock3, MapPin, UserRound, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath } from '@/features/auth/screenPermissions'
import { puedeConsultarAgendaVisitas } from '../utils/pushAccess'
import { eventoHaPasado } from '@/features/calendar/services/eventHistory'
import {
  obtenerDetalleInvitacion, obtenerMiReprogramacion, responderInvitacion,
  solicitarReprogramacion, type DetalleInvitacion, type SolicitudPropia,
} from '../services/invitationsService'

type Props = { eventoId: number | null; onClose: () => void; onResponded: () => void }

function mostrarFecha(fecha: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha
  return new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${fecha}T12:00:00Z`))
}

function Campo({ icono: Icono, nombre, valor }: { icono: typeof CalendarDays; nombre: string; valor: string }) {
  return <div className="flex min-w-0 items-start gap-2.5">
    <Icono size={18} className="mt-0.5 shrink-0 text-brand-500" aria-hidden="true" />
    <div className="min-w-0"><p className="text-xs font-medium text-gray-500 dark:text-gray-400">{nombre}</p>
      <p className="break-words text-sm text-gray-800 dark:text-gray-200">{valor}</p></div>
  </div>
}

const etiquetas: Record<string, string> = {
  PENDIENTE: 'Pendiente de respuesta', ACEPTADA: 'Aceptada', RECHAZADA: 'Rechazada (histórica)',
  REPROGRAMACION: 'Reprogramación solicitada', ASIGNADO: 'Asignación anterior',
}

const hoyEnGuatemala = () => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())

export default function InvitacionDetalleDialog({ eventoId, onClose, onResponded }: Props) {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [detalle, setDetalle] = useState<DetalleInvitacion | null>(null)
  const [solicitudActual, setSolicitudActual] = useState<SolicitudPropia | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [fechaPropuesta, setFechaPropuesta] = useState('')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (eventoId === null) return
    const controller = new AbortController()
    setDetalle(null)
    setSolicitudActual(null)
    setMostrarFormulario(false)
    setFechaPropuesta('')
    setMotivo('')
    setError('')
    setCargando(true)
    void Promise.all([
      obtenerDetalleInvitacion(eventoId, controller.signal),
      obtenerMiReprogramacion(eventoId, controller.signal),
    ]).then(([invitacion, propuesta]) => {
      if (controller.signal.aborted) return
      setDetalle(invitacion)
      setSolicitudActual(propuesta.data)
    }).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo cargar la invitación.')
    }).finally(() => { if (!controller.signal.aborted) setCargando(false) })
    return () => controller.abort()
  }, [eventoId])

  async function responder() {
    if (!detalle || !['PENDIENTE', 'RECHAZADA'].includes(detalle.estado ?? '') ||
        eventoHaPasado(detalle.fechaFin) || guardando) return
    setGuardando(true)
    setError('')
    try {
      const result = await responderInvitacion(detalle.eventoId, 'ACEPTADA')
      setDetalle(actual => actual ? { ...actual, estado: result.estado, respondidaEn: result.respondidaEn } : actual)
      setMostrarFormulario(false)
      onResponded()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible registrar tu respuesta.')
    } finally { setGuardando(false) }
  }

  async function enviarPropuesta() {
    if (!detalle || guardando || eventoHaPasado(detalle.fechaFin)) return
    const explicacion = motivo.trim()
    if (!fechaPropuesta || fechaPropuesta < hoyEnGuatemala() || fechaPropuesta === detalle.fechaInicio ||
        explicacion.length < 5 || explicacion.length > 500) {
      setError('Selecciona otra fecha válida e indica un motivo de 5 a 500 caracteres.')
      return
    }
    setGuardando(true)
    setError('')
    try {
      const result = await solicitarReprogramacion(detalle.eventoId, fechaPropuesta, explicacion)
      setDetalle(actual => actual ? { ...actual, estado: 'REPROGRAMACION', respondidaEn: new Date().toISOString() } : actual)
      setSolicitudActual({ id: result.id, estado: 'PENDIENTE', fechaOriginal: detalle.fechaInicio,
        fechaPropuesta, motivo: explicacion, resolucion: null, creadoEn: new Date().toISOString(), resueltoEn: null })
      setMostrarFormulario(false)
      onResponded()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible enviar la propuesta.')
    } finally { setGuardando(false) }
  }

  const puedeVerCalendario = Boolean(usuario && canViewPath(usuario, '/calendario'))
  // El permiso del menú por sí solo no garantiza acceso a /api/v1/visitas.
  const puedeVerAgenda = Boolean(usuario && canViewPath(usuario, '/visitas/agenda') &&
    puedeConsultarAgendaVisitas(usuario))
  const finalizada = Boolean(detalle && eventoHaPasado(detalle.fechaFin))
  const puedeResponder = Boolean(detalle && !finalizada &&
    ['PENDIENTE', 'ACEPTADA', 'RECHAZADA'].includes(detalle.estado ?? ''))
  return <Dialog open={eventoId !== null} onClose={onClose} title="Resumen de invitación"
    description="Consulta la actividad institucional y registra tu respuesta." className="max-w-xl">
    {cargando && <p role="status" className="py-8 text-center text-sm text-gray-500">Cargando invitación...</p>}
    {detalle && <div className="space-y-5">
      {finalizada && <p role="status" className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">Esta actividad ya finalizó. La invitación permanece disponible como historial y su respuesta no puede modificarse.</p>}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="flex items-start gap-3"><CalendarDays className="mt-1 shrink-0 text-brand-500" size={25} />
          <div><h3 className="font-semibold text-gray-900 dark:text-white">{detalle.titulo}</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{detalle.categoria.replaceAll('_', ' ')}</p></div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo icono={CalendarDays} nombre="Fecha" valor={mostrarFecha(detalle.fechaInicio)} />
        <Campo icono={Clock3} nombre="Hora" valor={detalle.horaInicio ? `${detalle.horaInicio}${detalle.horaFin ? ` - ${detalle.horaFin}` : ''}` : 'No especificada'} />
        <Campo icono={MapPin} nombre="Lugar" valor={detalle.lugar || 'No especificado'} />
        <Campo icono={UserRound} nombre="Organizador" valor={detalle.organizador} />
      </div>
      {detalle.descripcion && <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
        <p className="mb-1 text-sm font-semibold text-gray-800 dark:text-gray-200">Descripción</p>
        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-600 dark:text-gray-300">{detalle.descripcion}</p>
      </div>}
      <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
        <UsersRound size={17} className="shrink-0" />
        <span>Estado: <strong>{etiquetas[detalle.estado ?? ''] ?? 'Solo consulta'}</strong></span>
      </div>
      {detalle.estado === 'PENDIENTE' && !finalizada && <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
        Si aceptas, esta actividad aparecerá en tu calendario personal.
        Dirección y Coordinación podrán consultar tu respuesta.
      </p>}
      {detalle.estado === 'ACEPTADA' && <p className="text-sm text-emerald-700 dark:text-emerald-300">
        {puedeVerCalendario || puedeVerAgenda
          ? 'Confirmaste tu participación. La actividad aparecerá en tu agenda personal.'
          : 'Confirmaste tu participación. Puedes consultar los detalles de la actividad en esta invitación.'}
      </p>}
      {detalle.estado === 'RECHAZADA' && <p className="text-sm text-gray-600 dark:text-gray-300">
        Has rechazado la invitación. La actividad no aparecerá en tu agenda personal.
      </p>}
      {puedeResponder && detalle.estado !== 'PENDIENTE' && <p className="text-xs text-gray-500 dark:text-gray-400">
        Puedes solicitar una nueva fecha mientras la actividad no haya finalizado.
      </p>}
      {detalle.estado === 'REPROGRAMACION' && <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
        La reprogramación está pendiente de la decisión del organizador.
      </div>}
      {solicitudActual && <div className="rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700">
        <p className="font-semibold text-gray-800 dark:text-gray-200">Última propuesta: {solicitudActual.estado === 'PENDIENTE' ? 'En revisión' : solicitudActual.estado === 'APROBADA' ? 'Aprobada' : solicitudActual.estado === 'MANTENIDA' ? 'No aprobada' : 'Sin efecto'}</p>
        <p className="mt-1 text-gray-600 dark:text-gray-300">Fecha propuesta: {mostrarFecha(solicitudActual.fechaPropuesta)}</p>
        <p className="mt-1 whitespace-pre-wrap text-gray-600 dark:text-gray-300">Motivo: {solicitudActual.motivo}</p>
      </div>}
    </div>}
    {mostrarFormulario && puedeResponder && <div className="mt-4 space-y-3 rounded-xl border border-brand-200 bg-brand-50/30 p-4 dark:border-brand-700 dark:bg-brand-500/5">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Proponer nueva fecha</h3>
      <label htmlFor="invitacion-nueva-fecha" className="block text-xs font-medium text-gray-700 dark:text-gray-300">Nueva fecha</label>
      <input id="invitacion-nueva-fecha" type="date" required min={hoyEnGuatemala()} value={fechaPropuesta}
        onChange={e => setFechaPropuesta(e.target.value)} disabled={guardando}
        className="layout-focus min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
      <label htmlFor="invitacion-motivo" className="block text-xs font-medium text-gray-700 dark:text-gray-300">Motivo de reprogramación</label>
      <textarea id="invitacion-motivo" required minLength={5} maxLength={500} rows={3} value={motivo}
        onChange={e => setMotivo(e.target.value)} disabled={guardando}
        placeholder="Explica brevemente por qué necesitas cambiar la fecha"
        className="layout-focus w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
      <p className="text-xs text-gray-500 dark:text-gray-400">El cambio se aplicará únicamente si el organizador lo aprueba.</p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" type="button" disabled={guardando} onClick={() => setMostrarFormulario(false)}>Cancelar</Button>
        <Button type="button" disabled={guardando || !fechaPropuesta || fechaPropuesta < hoyEnGuatemala() || fechaPropuesta === detalle?.fechaInicio || motivo.trim().length < 5 || motivo.trim().length > 500} onClick={() => void enviarPropuesta()}>
          {guardando ? 'Enviando...' : 'Enviar propuesta'}
        </Button>
      </div>
    </div>}
    {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
    <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
      <Button variant="secondary" type="button" onClick={onClose}>Cerrar</Button>
      {puedeResponder && <>
        {detalle?.estado !== 'ACEPTADA' && <Button type="button" disabled={guardando} onClick={() => void responder()}>
          Aceptar
        </Button>}
        <Button variant="secondary" type="button" disabled={guardando} onClick={() => { setError(''); setMostrarFormulario(actual => !actual) }}>
          {mostrarFormulario ? 'Ocultar formulario' : 'Reprogramar'}
        </Button>
      </>}
      {detalle?.estado === 'ACEPTADA' && (puedeVerCalendario || puedeVerAgenda) && <Button type="button" onClick={() => { onClose(); navigate(puedeVerCalendario ? '/calendario' : '/visitas/agenda') }}>{puedeVerCalendario ? 'Ver calendario' : 'Ver agenda de visitas'}</Button>}
    </div>
  </Dialog>
}
