import { AlertCircle, Bell, CalendarDays, CheckCheck, ClipboardList, LoaderCircle } from 'lucide-react'
import type { Notificacion } from '../services/notificationsService'
import { fechaNotificacion, tiempoNotificacion } from '../utils/notificationUtils'

type Props = {
  notificacion: Notificacion
  destino: string | null
  onActivar: () => void
  procesando?: boolean
}

function iconoTipo(tipo: string) {
  const normalizado = tipo.toUpperCase()
  if (normalizado.includes('CALENDARIO') || normalizado.includes('EVENTO') || normalizado.includes('CAPACITACION')) return CalendarDays
  if (normalizado.includes('VISITA') || normalizado.includes('SEGUIMIENTO') || normalizado.includes('COMPROMISO')) return ClipboardList
  if (normalizado.includes('ALERTA') || normalizado.includes('VENCID')) return AlertCircle
  return Bell
}

export default function NotificacionItem({ notificacion, destino, onActivar, procesando = false }: Props) {
  const leida = Boolean(notificacion.fechaLectura)
  const Icono = iconoTipo(notificacion.tipo)
  const inactiva = leida && !destino
  return <li className="list-none border-b border-gray-100 last:border-b-0 dark:border-gray-800">
    <button
      type="button"
      onClick={onActivar}
      disabled={procesando || inactiva}
      aria-label={destino ? `Abrir actividad: ${notificacion.titulo}` : leida ? `${notificacion.titulo}, leída` : `Marcar como leída: ${notificacion.titulo}`}
      className={`layout-focus flex w-full items-start gap-3 rounded-lg px-3 py-3.5 text-left transition-colors disabled:cursor-default sm:px-4 ${inactiva ? '' : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'} ${leida ? '' : 'bg-brand-50/50 dark:bg-brand-500/[0.06]'}`}
    >
      <span aria-hidden="true" className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        <Icono size={18} strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className={`block break-words text-sm leading-5 ${leida ? 'font-medium text-gray-700 dark:text-gray-300' : 'font-semibold text-gray-900 dark:text-white'}`}>{notificacion.titulo}</span>
          {!leida && <span aria-label="Sin leer" className="mt-1.5 size-2 shrink-0 rounded-full bg-orange-400" />}
        </span>
        <span className="mt-1 block break-words text-xs leading-5 text-gray-500 dark:text-gray-400">{notificacion.mensaje}</span>
        <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="max-w-32 truncate">{notificacion.tipo.replaceAll('_', ' ')}</span>
          <span aria-hidden="true" className="size-1 rounded-full bg-gray-400" />
          <time dateTime={notificacion.fechaCreacion} title={fechaNotificacion(notificacion.fechaCreacion)}>{tiempoNotificacion(notificacion.fechaCreacion)}</time>
          {procesando ? <LoaderCircle aria-label="Guardando" className="animate-spin" size={13} /> : leida ? <CheckCheck aria-label="Leída" size={14} /> : null}
        </span>
      </span>
    </button>
  </li>
}
