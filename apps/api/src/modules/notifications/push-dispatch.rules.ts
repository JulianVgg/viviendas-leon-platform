// NTF-12: reglas para intentos y mensajes mínimos, sin información personal.
export const INTERVALO_PUSH_MS = 30_000
export const MAXIMO_ENTREGAS_LOTE = 20
export const MAXIMO_INTENTOS_PUSH = 5

export function estadoTrasFalloPush(codigo: number | null, intentosPrevios: number, ahora: Date) {
  const reintentable = codigo === null || codigo === 408 || codigo === 425 || codigo === 429 ||
    (codigo >= 500 && codigo <= 599)
  if (!reintentable || intentosPrevios + 1 >= MAXIMO_INTENTOS_PUSH) {
    return { estado: 'ERROR' as const, proximoIntento: null }
  }
  const minutos = 2 ** intentosPrevios
  return { estado: 'PENDIENTE' as const, proximoIntento: new Date(ahora.getTime() + minutos * 60_000) }
}

export function payloadPushMinimo(id: number, destino: string) {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('ID de aviso inválido')
  return JSON.stringify({ version: 1, notificacionId: id, url: destino })
}
