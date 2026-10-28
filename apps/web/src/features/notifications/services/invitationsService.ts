import type { Notificacion } from './notificationsService'

export type EstadoInvitacion = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'ASIGNADO'

export type DetalleInvitacion = {
  eventoId: number
  titulo: string
  categoria: string
  descripcion: string
  lugar: string
  fechaInicio: string
  fechaFin: string
  horaInicio: string | null
  horaFin: string | null
  organizador: string
  estado: EstadoInvitacion | null
  respondidaEn: string | null
}

export type ParticipanteRespuesta = {
  usuarioId: number
  nombre: string
  estado: EstadoInvitacion
  respondidaEn: string | null
}

export type ResumenInvitacion = {
  eventoId: number
  titulo: string
  fechaInicio: string
  invitados: number
  aceptaron: number
  rechazaron: number
  pendientes: number
  participantes: ParticipanteRespuesta[]
}

// El servidor genera claves del tipo CAL:ID:CREACION:USUARIO o CAL:ID:Vn:USUARIO.
// No se usa el mensaje (texto libre) para obtener identificadores.
export function eventoDeNotificacion(notificacion: Pick<Notificacion, 'tipo' | 'claveEvento'>): number | null {
  if (notificacion.tipo !== 'INVITACION_EVENTO') return null
  const match = /^CAL:([1-9]\d*):(?:CREACION|V\d+):[1-9]\d*$/.exec(notificacion.claveEvento ?? '')
  const id = match ? Number(match[1]) : NaN
  return Number.isSafeInteger(id) && id <= 2_147_483_647 ? id : null
}

async function solicitud<T>(ruta: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/invitaciones${ruta}`, {
    cache: 'no-store', credentials: 'same-origin',
    ...init,
    headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string | { message?: string } } | null
    const msg = typeof body?.error === 'string' ? body.error : body?.error?.message
    throw new Error(msg || (response.status === 404 ? 'La invitación ya no está disponible.'
      : response.status === 403 ? 'No tienes permiso para consultar esta invitación.'
        : response.status === 401 ? 'Debes iniciar sesión nuevamente.' : 'Error consultando invitaciones.'))
  }
  return response.json() as Promise<T>
}

/** Invitaciones de la sesión. Solo aceptadas o asignadas se muestran en Mi calendario. */
export function obtenerMisInvitaciones(signal?: AbortSignal) {
  return solicitud<{ data: DetalleInvitacion[] }>('/mias', { signal })
}

export function obtenerDetalleInvitacion(id: number, signal?: AbortSignal) {
  return solicitud<DetalleInvitacion>(`/${id}`, { signal })
}

export function obtenerResumenInvitaciones(signal?: AbortSignal) {
  return solicitud<{ data: ResumenInvitacion[] }>('/resumen', { signal })
}

export function responderInvitacion(id: number, estado: 'ACEPTADA' | 'RECHAZADA') {
  return solicitud<{ estado: EstadoInvitacion; respondidaEn: string; sinCambios: boolean }>(
    `/${id}/respuesta`, {
      method: 'PATCH',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ estado }),
    },
  )
}

/** Los datos individuales solo se entregan a Dirección y Coordinación. */
export function obtenerParticipantesInvitacion(id: number, signal?: AbortSignal) {
  return solicitud<{ data: ParticipanteRespuesta[] }>(`/${id}/participantes`, { signal })
}
