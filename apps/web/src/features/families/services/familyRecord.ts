export function formatRecordDate(value: string | null | undefined): string {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-GT', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

export function familyStateVariant(state: string): 'success' | 'warning' | 'neutral' {
  if (state.toUpperCase() === 'ACTIVA') return 'success'
  if (state.toUpperCase() === 'RETIRADA') return 'warning'
  return 'neutral'
}

export type RecordFailure = {
  kind: 'invalid' | 'session' | 'denied' | 'missing' | 'disabled' | 'unavailable' | 'server' | 'network'
  title: string
  message: string
  retry: boolean
}

export function recordFailure(status?: number, code?: string): RecordFailure {
  if (status === 400) return { kind: 'invalid', title: 'Identificador no válido', message: 'Revisa el enlace del expediente o vuelve al listado de familias.', retry: false }
  if (status === 401) return { kind: 'session', title: 'Sesión expirada o no válida', message: 'Inicia sesión nuevamente para consultar el expediente.', retry: false }
  if (status === 403) return { kind: 'denied', title: 'Acceso denegado', message: 'No tienes permiso para consultar este expediente.', retry: false }
  if (status === 404 && code === 'FAMILY_NOT_FOUND') return { kind: 'missing', title: 'Expediente inexistente', message: 'La familia solicitada no existe. Vuelve al listado para seleccionar otra familia.', retry: false }
  if (status === 404 && code === 'NOT_FOUND') return { kind: 'disabled', title: 'Servicio integral no disponible', message: 'La ruta del expediente no está disponible en este despliegue. Contacta al administrador.', retry: true }
  if (status === 404) return { kind: 'unavailable', title: 'Servicio integral no disponible', message: 'No fue posible identificar la respuesta del servicio. No se puede concluir que la familia no exista.', retry: true }
  if (status && status >= 500) return { kind: 'server', title: 'Error interno del servidor', message: 'No fue posible consultar el expediente. Intenta nuevamente más tarde.', retry: true }
  return { kind: 'network', title: 'No se pudo conectar con el servicio', message: 'Comprueba la conexión y vuelve a intentar. Este expediente no se guarda para consulta sin conexión.', retry: true }
}
