// Todas las fechas de actividades sin hora se interpretan en la zona de Guatemala (UTC-06).
// Nunca se emplea la zona horaria del servidor, que puede estar en UTC.
export const OPCIONES_DIA = ['DOS_DIAS_ANTES', 'DIA_ANTES', 'MISMO_DIA'] as const
export type OpcionDia = typeof OPCIONES_DIA[number]
export type ReglaRecordatorio = { tipo: OpcionDia } | { tipo: 'PERSONALIZADO'; fechaHora: string }
export type TipoOrigen = 'CALENDARIO' | 'VISITA'

const esFecha = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(`${v}T12:00:00Z`)) && new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v
const horaLocal = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/
const offsets: Record<OpcionDia, number> = { DOS_DIAS_ANTES: 2, DIA_ANTES: 1, MISMO_DIA: 0 }
export const DEFAULT_RECORDATORIOS: ReglaRecordatorio[] = [{ tipo: 'DIA_ANTES' }]

export function parsePreferencias(value: unknown): OpcionDia[] | null {
  if (!Array.isArray(value) || value.length > 3 ||
      !value.every(v => typeof v === 'string' && OPCIONES_DIA.includes(v as OpcionDia)) ||
      new Set(value).size !== value.length) return null
  return value as OpcionDia[]
}

/** null = usar preferencias de destinatario; [] = no programar; lista = reglas explícitas. */
export function parseReglas(value: unknown, fechaActividad: string): ReglaRecordatorio[] | null | undefined {
  if (value === undefined || value === null) return null
  if (!esFecha(fechaActividad) || !Array.isArray(value) || value.length > 4) return undefined
  const keys = new Set<string>()
  const parsed: ReglaRecordatorio[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
    const item = raw as Record<string, unknown>
    if (typeof item.tipo !== 'string') return undefined
    if (OPCIONES_DIA.includes(item.tipo as OpcionDia) && Object.keys(item).length === 1) {
      if (keys.has(item.tipo)) return undefined
      keys.add(item.tipo)
      parsed.push({ tipo: item.tipo as OpcionDia })
    } else if (item.tipo === 'PERSONALIZADO' && typeof item.fechaHora === 'string' &&
        horaLocal.test(item.fechaHora) && esFecha(item.fechaHora.slice(0, 10)) &&
        Object.keys(item).length === 2 && item.fechaHora.slice(0, 10) <= fechaActividad) {
      const key = `PERSONALIZADO:${item.fechaHora}`
      if (keys.has(key)) return undefined
      keys.add(key)
      parsed.push({ tipo: 'PERSONALIZADO', fechaHora: item.fechaHora })
    } else return undefined
  }
  return parsed
}

// Disparar a las 08:00 de Guatemala: 14:00 UTC. La fecha personalizada usa UTC-6.
export function fechaProgramada(fechaActividad: string, regla: ReglaRecordatorio): Date {
  if (regla.tipo === 'PERSONALIZADO') return new Date(`${regla.fechaHora}:00-06:00`)
  const fecha = new Date(`${fechaActividad}T14:00:00Z`)
  fecha.setUTCDate(fecha.getUTCDate() - offsets[regla.tipo])
  return fecha
}

/** Si una visita cambia de fecha, descarta solo las fechas manuales incompatibles.
 * null sigue significando usar las preferencias individuales; [] sigue desactivado. */
export function reglasTrasCambioFecha(reglas: ReglaRecordatorio[] | null, nuevaFecha: string): ReglaRecordatorio[] | null {
  if (reglas === null) return null
  return reglas.filter(regla => regla.tipo !== 'PERSONALIZADO' || regla.fechaHora.slice(0, 10) <= nuevaFecha)
}
