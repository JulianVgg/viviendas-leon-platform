export type CycleInput = {
  huertoId: number
  cultivoId: number
  fechaSiembra: string | null
  fechaTrasplante: string | null
  cantidadPlantas: number | null
  observaciones: string | null
}
export type FieldError = { field: string; message: string }
const MAX_ID = 2_147_483_647
const allowed = new Set(['huertoId', 'cultivoId', 'fechaSiembra', 'fechaTrasplante', 'cantidadPlantas', 'observaciones'])

export function parseCycleId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id <= MAX_ID ? id : null
}

function idValue(value: unknown, field: string, details: FieldError[]): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > MAX_ID) {
    details.push({ field, message: 'Selecciona un registro válido.' })
    return 0
  }
  return value
}

function validDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const dt = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(dt.getTime()) && dt.toISOString().slice(0, 10) === value
}

export function validateCycleInput(body: unknown): { data?: CycleInput; details: FieldError[] } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { details: [{ field: 'body', message: 'Envía un objeto JSON válido.' }] }
  }
  const source = body as Record<string, unknown>
  const details: FieldError[] = []
  for (const key of Object.keys(source)) if (!allowed.has(key)) {
    details.push({ field: key, message: 'Este campo no está permitido.' })
  }
  const huertoId = idValue(source.huertoId, 'huertoId', details)
  const cultivoId = idValue(source.cultivoId, 'cultivoId', details)
  function readDate(key: 'fechaSiembra' | 'fechaTrasplante'): string | null {
    const raw = source[key]
    if (raw === undefined || raw === null || raw === '') return null
    if (!validDay(raw)) {
      details.push({ field: key, message: 'Ingresa una fecha válida (AAAA-MM-DD).' })
      return null
    }
    return raw
  }
  const fechaSiembra = readDate('fechaSiembra')
  const fechaTrasplante = readDate('fechaTrasplante')
  if (!fechaSiembra && !fechaTrasplante && !details.some(d => d.field === 'fechaSiembra' || d.field === 'fechaTrasplante')) {
    details.push({ field: 'fechaSiembra', message: 'Indica al menos una fecha de siembra o trasplante.' })
  }
  if (fechaSiembra && fechaTrasplante && fechaTrasplante < fechaSiembra) {
    details.push({ field: 'fechaTrasplante', message: 'El trasplante no puede ser anterior a la siembra.' })
  }
  let cantidadPlantas: number | null = null
  const qty = source.cantidadPlantas
  if (qty !== undefined && qty !== null && qty !== '') {
    if (typeof qty !== 'number' || !Number.isSafeInteger(qty) || qty < 1 || qty > MAX_ID) {
      details.push({ field: 'cantidadPlantas', message: 'Ingresa un número entero positivo de plantas.' })
    } else cantidadPlantas = qty
  }
  let observaciones: string | null = null
  if (source.observaciones !== undefined && source.observaciones !== null && source.observaciones !== '') {
    if (typeof source.observaciones !== 'string' || source.observaciones.length > 2000 ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(source.observaciones)) {
      details.push({ field: 'observaciones', message: 'Las observaciones no son válidas (máximo 2000 caracteres).' })
    } else observaciones = source.observaciones.normalize('NFC').trim() || null
  }
  if (details.length) return { details }
  return { data: { huertoId, cultivoId, fechaSiembra, fechaTrasplante, cantidadPlantas, observaciones }, details }
}
