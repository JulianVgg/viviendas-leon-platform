import { useEffect, useState } from 'react'
import { CalendarDays, Clock3, MapPin, UserRound, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath } from '@/features/auth/screenPermissions'
import { eventoHaPasado } from '@/features/calendar/services/eventHistory'
import {
  obtenerDetalleInvitacion, responderInvitacion, type DetalleInvitacion,
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
  PENDIENTE: 'Pendiente de respuesta', ACEPTADA: 'Aceptada', RECHAZADA: 'Rechazada', ASIGNADO: 'Asignación anterior',
}

export default function InvitacionDetalleDialog({ eventoId, onClose, onResponded }: Props) {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [detalle, setDetalle] = useState<DetalleInvitacion | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (eventoId === null) return
    const controller = new AbortController()
    setDetalle(null)
    setError('')
    setCargando(true)
    void obtenerDetalleInvitacion(eventoId, controller.signal)
      .then(result => { if (!controller.signal.aborted) setDetalle(result) })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo cargar la invitación.') })
      .finally(() => { if (!controller.signal.aborted) setCargando(false) })
    return () => controller.abort()
  }, [eventoId])

  async function responder(estado: 'ACEPTADA' | 'RECHAZADA') {
    if (!detalle || !['PENDIENTE', 'ACEPTADA', 'RECHAZADA'].includes(detalle.estado ?? '') ||
        detalle.estado === estado || eventoHaPasado(detalle.fechaFin) || guardando) return
    setGuardando(true)
    setError('')
    try {
      const result = await responderInvitacion(detalle.eventoId, estado)
      setDetalle(actual => actual ? { ...actual, estado: result.estado, respondidaEn: result.respondidaEn } : actual)
      onResponded()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible registrar tu respuesta.')
    } finally { setGuardando(false) }
  }

  const puedeVerCalendario = Boolean(usuario && canViewPath(usuario, '/calendario'))
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
        Confirmaste tu participación. La actividad aparecerá en tu agenda personal.
      </p>}
      {detalle.estado === 'RECHAZADA' && <p className="text-sm text-gray-600 dark:text-gray-300">
        Has rechazado la invitación. La actividad no aparecerá en tu agenda personal.
      </p>}
      {puedeResponder && detalle.estado !== 'PENDIENTE' && <p className="text-xs text-gray-500 dark:text-gray-400">
        Puedes cambiar tu respuesta mientras la actividad no haya finalizado.
      </p>}
    </div>}
    {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
    <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
      <Button variant="secondary" type="button" onClick={onClose}>Cerrar</Button>
      {puedeResponder && <>
        {detalle?.estado !== 'RECHAZADA' && <Button variant="danger" type="button" disabled={guardando} onClick={() => void responder('RECHAZADA')}>
          {detalle?.estado === 'ACEPTADA' ? 'Cambiar a rechazada' : 'Rechazar'}
        </Button>}
        {detalle?.estado !== 'ACEPTADA' && <Button type="button" disabled={guardando} onClick={() => void responder('ACEPTADA')}>
          {detalle?.estado === 'RECHAZADA' ? 'Cambiar a aceptada' : 'Aceptar'}
        </Button>}
      </>}
      {detalle?.estado === 'ACEPTADA' && (puedeVerCalendario || canViewPath(usuario ?? {roles:[],permisos:[]}, '/visitas/agenda')) && <Button type="button" onClick={() => { onClose(); navigate(puedeVerCalendario ? '/calendario' : '/visitas/agenda') }}>Ver calendario</Button>}
    </div>
  </Dialog>
}
