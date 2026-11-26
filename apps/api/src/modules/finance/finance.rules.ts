export const FIN_TYPES = {
  bancos: { code: 'BANCO', permission: 'PANTALLA_FINANZAS_BANCOS' },
  'caja-chica': { code: 'CAJA_CHICA', permission: 'PANTALLA_FINANZAS_CAJA' },
  'fondos-medicos': { code: 'FONDO_MEDICO', permission: 'PANTALLA_FINANZAS_MEDICOS' },
} as const
export type FinType = keyof typeof FIN_TYPES
export const isFinType = (value: string): value is FinType => Object.prototype.hasOwnProperty.call(FIN_TYPES, value)
export const validAmount = (value: unknown, allowZero = false): value is string => {
  const val = typeof value === 'number' && Number.isFinite(value) ? String(value) : value
  return typeof val === 'string' && /^\d{1,9}(?:\.\d{1,2})?$/.test(val) && (allowZero || Number(val) > 0)
}
export const validDay = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
}
export const validMonth = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
export const textField = (value: unknown, max: number, required = false): string | null => {
  if ((value === null || value === undefined || value === '') && !required) return ''
  return typeof value === 'string' && value.trim().length >= (required ? 1 : 0) && value.trim().length <= max ? value.trim() : null
}
export const positiveId = (value: unknown): number | null => {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  const n = Number(value)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}
export const accountBalance = (opening: string, movements: Array<{ tipo: string; importe: string; anulado?: boolean }>): number =>
  movements.reduce((sum, item) => sum + (item.anulado ? 0 : (item.tipo === 'INGRESO' ? 1 : -1) * Number(item.importe)), Number(opening))
export const isInternalTransfer = (reference: unknown): boolean => typeof reference === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(reference)
/** Solo importes externos; los traslados entre cuentas quedan excluidos antes de llamar esta función. */
const cents = (value: string) => {
  const negative = value.startsWith('-')
  const [integer, fraction = ''] = value.replace('-', '').split('.')
  const result = BigInt(integer) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2))
  return negative ? -result : result
}
const displayCents = (value: bigint) => {
  const sign = value < 0n ? '-' : ''
  const absolute = value < 0n ? -value : value
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`
}
export const externalTotals = (rows: Array<{ ingresos: string; egresos: string }>) => {
  const ingresos = rows.reduce((sum, item) => sum + cents(item.ingresos), 0n)
  const egresos = rows.reduce((sum, item) => sum + cents(item.egresos), 0n)
  return { ingresos: displayCents(ingresos), egresos: displayCents(egresos), resultado: displayCents(ingresos - egresos) }
}
