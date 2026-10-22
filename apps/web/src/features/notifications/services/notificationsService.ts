/** Cliente NTF-01: los destinatarios se resuelven a partir de la sesión. */
export type Notificacion = {
  id: number
  tipo: string
  titulo: string
  mensaje: string
  referencia: string | null
  fechaCreacion: string
  fechaLectura: string | null
}

export type EstadoNotificacion = 'todas' | 'no_leidas' | 'leidas'

export type ListadoNotificaciones = {
  notificaciones: Notificacion[]
  paginacion: { pagina: number; limite: number; total: number; totalPaginas: number }
  noLeidas: number
}

async function solicitar<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1/notificaciones${path}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
  })
  if (!response.ok) {
    if (response.status === 401) throw new Error('Tu sesión ha expirado. Inicia sesión nuevamente.')
    if (response.status === 403) throw new Error('No tienes acceso a las notificaciones.')
    throw new Error('No se pudo completar la operación. Comprueba tu conexión e inténtalo de nuevo.')
  }
  return response.json() as Promise<T>
}

export function obtenerContadorNotificaciones(signal?: AbortSignal) {
  return solicitar<{ noLeidas: number }>('/contador', { signal })
}

export function obtenerNotificaciones({ pagina = 1, limite = 10, estado = 'todas', signal }: {
  pagina?: number
  limite?: number
  estado?: EstadoNotificacion
  signal?: AbortSignal
} = {}) {
  const query = new URLSearchParams({ pagina: String(pagina), limite: String(limite), estado })
  return solicitar<ListadoNotificaciones>(`?${query}`, { signal })
}

const patchOptions: RequestInit = {
  method: 'PATCH',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
}

export function marcarNotificacionLeida(id: number) {
  return solicitar<{ id: number; leida: boolean; fechaLectura: string }>(`/${id}/leer`, patchOptions)
}

export function marcarTodasNotificacionesLeidas() {
  return solicitar<{ actualizadas: number }>('/leer-todas', patchOptions)
}

/** El encabezado escucha este evento cuando se leen notificaciones en otra pantalla. */
export const NOTIFICACIONES_ACTUALIZADAS = 'viviendas-leon:notificaciones-actualizadas'

export function emitirCambioNotificaciones() {
  window.dispatchEvent(new Event(NOTIFICACIONES_ACTUALIZADAS))
}
