export type EstadoValidacion = 'PRELIMINAR' | 'EN_REVISION' | 'VALIDADO' | 'CAMBIOS_POSTERIORES'

export function etiquetaValidacion(estado: EstadoValidacion) {
  return ({ PRELIMINAR: 'Pendiente de validación', EN_REVISION: 'En revisión',
    VALIDADO: 'Validado', CAMBIOS_POSTERIORES: 'Cambios posteriores' })[estado]
}
export function colorValidacion(estado: EstadoValidacion): 'success' | 'warning' | 'error' | 'neutral' {
  if (estado === 'VALIDADO') return 'success'
  if (estado === 'CAMBIOS_POSTERIORES') return 'error'
  if (estado === 'EN_REVISION') return 'neutral'
  return 'warning'
}
export function resumenAccion(accion: string) {
  return ({ VALIDACION: 'Informe validado', REVISION: 'Enviado a revisión', REAPERTURA: 'Revisión reabierta' } as Record<string, string>)[accion] ?? 'Actualización registrada'
}
