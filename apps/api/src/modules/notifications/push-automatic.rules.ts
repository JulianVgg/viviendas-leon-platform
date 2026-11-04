// NTF-12: reglas puras. No hay consultas ni llamadas al proveedor de push aquí.
// Viviendas León opera en Guatemala, cuya hora civil es UTC-06 sin horario de verano.
export type PreferenciasPush = {
  habilitadas: boolean
  silencioInicio: string | null
  silencioFin: string | null
}

export const PREFERENCIAS_PUSH_POR_DEFECTO: PreferenciasPush = {
  habilitadas: true,
  silencioInicio: null,
  silencioFin: null,
}

const HORA_VALIDA = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const MINUTOS_DIA = 1440
const MINUTOS_GUATEMALA = 360

function minutos(hora: string): number {
  const [hh, mm] = hora.split(':').map(Number)
  return hh * 60 + mm
}

export function validarPreferenciasPush(valor: unknown): PreferenciasPush | null {
  if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) return null
  const obj = valor as Record<string, unknown>
  if (Object.keys(obj).some(k => !['habilitadas', 'silencioInicio', 'silencioFin'].includes(k)) ||
      typeof obj.habilitadas !== 'boolean') return null
  const inicio = obj.silencioInicio
  const fin = obj.silencioFin
  if (inicio === null && fin === null) {
    return { habilitadas: obj.habilitadas, silencioInicio: null, silencioFin: null }
  }
  if (typeof inicio !== 'string' || !HORA_VALIDA.test(inicio) ||
      typeof fin !== 'string' || !HORA_VALIDA.test(fin) || inicio === fin) return null
  return { habilitadas: obj.habilitadas, silencioInicio: inicio, silencioFin: fin }
}

/** Retorna el primer instante permitido; si no hay silencio, devuelve 'ahora'. */
export function proximoEnvioPermitido(ahora: Date, inicio: string | null, fin: string | null): Date {
  if (!inicio || !fin) return ahora
  if (!HORA_VALIDA.test(inicio) || !HORA_VALIDA.test(fin) || inicio === fin) {
    throw new Error('Horario de silencio inválido')
  }
  // Mover el reloj instantáneo seis horas atrás; leer sus campos UTC como Guatemala.
  const horaGt = new Date(ahora.getTime() - MINUTOS_GUATEMALA * 60_000)
  const minutoActual = horaGt.getUTCHours() * 60 + horaGt.getUTCMinutes()
  const desde = minutos(inicio)
  const hasta = minutos(fin)
  const duranteSilencio = desde < hasta
    ? minutoActual >= desde && minutoActual < hasta
    : minutoActual >= desde || minutoActual < hasta
  if (!duranteSilencio) return ahora
  const minutosHastaFin = (hasta - minutoActual + MINUTOS_DIA) % MINUTOS_DIA
  // El inicio del minuto actual debe descartarse: conservar segundos para no entregar antes de fin.
  return new Date(ahora.getTime() + minutosHastaFin * 60_000 -
    horaGt.getUTCSeconds() * 1000 - horaGt.getUTCMilliseconds())
}

/** No permitir URLs absolutas, protocol-relative ni rutas fuera de pantallas autorizadas. */
export function destinoSeguroPush(referencia: unknown): string {
  return referencia === '/calendario' || referencia === '/visitas/agenda'
    ? referencia : '/notificaciones'
}
