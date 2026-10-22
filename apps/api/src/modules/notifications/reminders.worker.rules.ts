/** Reglas deterministas para el procesador de NTF-05. */
export const INTERVALO_REVISION_MS = 60_000
export const LOTE_MAXIMO = 50
export const INTENTOS_MAXIMOS = 5
export const TIPO_RECORDATORIO = 'RECORDATORIO'

/** Backoff exponencial: 1, 2, 4, 8 minutos. Quinto fallo -> ERROR. */
export function resultadoFallo(intentosPrevios: number, ahora: Date): {
  estado: 'PENDIENTE' | 'ERROR'; proximoIntento: Date | null
} {
  const intentos = intentosPrevios + 1
  if (intentos >= INTENTOS_MAXIMOS) return { estado: 'ERROR', proximoIntento: null }
  const minutos = 2 ** (intentos - 1)
  return { estado: 'PENDIENTE', proximoIntento: new Date(ahora.getTime() + minutos * 60_000) }
}

export function resumenRecordatorio(origen: string, titulo: string, fecha: Date): {
  titulo: string; mensaje: string; referencia: string
} {
  // DateTime @db.Date: siempre serializar la fecha en UTC para no adelantar día.
  const dia = fecha.toISOString().slice(0, 10)
  if (origen === 'CALENDARIO') return {
    titulo: 'Recordatorio de actividad',
    mensaje: `Tienes la actividad «${titulo}» programada para el ${dia}.`,
    referencia: '/calendario',
  }
  if (origen === 'VISITA') return {
    titulo: 'Recordatorio de visita técnica',
    mensaje: `Tienes una visita técnica a la familia ${titulo} programada para el ${dia}.`,
    referencia: '/visitas/agenda',
  }
  throw new Error('Origen de recordatorio desconocido.')
}

export function permisoDeOrigen(origen: string) {
  if (origen === 'CALENDARIO') return 'PANTALLA_CALENDARIO'
  if (origen === 'VISITA') return 'PANTALLA_VISITAS_AGENDA'
  throw new Error('Origen de recordatorio desconocido.')
}
