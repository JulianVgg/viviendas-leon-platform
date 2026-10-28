// Las fechas de agenda son fechas civiles de Guatemala, no instantes UTC.
export function fechaHoyGuatemala(ahora: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ahora)
  const read = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return `${read('year')}-${read('month')}-${read('day')}`
}
export function diaGuatemala(iso: string): string | null {
  const instante = new Date(iso)
  return Number.isNaN(instante.getTime()) ? null : fechaHoyGuatemala(instante)
}
/** Las citas nuevas solo pueden programarse para hoy o una fecha futura en Guatemala. */
export function fechaProgramacionValida(fecha: string, ahora: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false
  const instante = new Date(`${fecha}T12:00:00Z`)
  return !Number.isNaN(instante.getTime()) && instante.toISOString().slice(0, 10) === fecha && fecha >= fechaHoyGuatemala(ahora)
}
export function requiereReprogramar(fechaProgramada: string, fechaRegistro: string): boolean {
  return fechaProgramada !== fechaRegistro
}
export function capturaValida(fechaRegistro: string, creadoEn: string | undefined, ahora: Date = new Date()): boolean {
  if (!creadoEn) return false
  const instante = new Date(creadoEn)
  if (Number.isNaN(instante.getTime()) || instante.getTime() > ahora.getTime() + 5 * 60 * 1000) return false
  return fechaRegistro === fechaHoyGuatemala(instante)
}

// Periodicidad institucional orientativa: una visita por familia cada 8 días.
export const CICLO_VISITA_DIAS = 8
export function sumarDiasCiviles(fecha: string, dias: number): string {
  const instant = new Date(`${fecha}T12:00:00Z`)
  if (Number.isNaN(instant.getTime()) || !Number.isInteger(dias)) throw new Error('Fecha no válida.')
  instant.setUTCDate(instant.getUTCDate() + dias)
  return instant.toISOString().slice(0, 10)
}
export function proximaFechaSugerida(ultimaVisita: string | null): string | null {
  return ultimaVisita ? sumarDiasCiviles(ultimaVisita, CICLO_VISITA_DIAS) : null
}

export function estaEnMismoCiclo(fechaA: string, fechaB: string): boolean {
  const a = Date.parse(`${fechaA}T12:00:00Z`)
  const b = Date.parse(`${fechaB}T12:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error('Fecha no válida.')
  return Math.abs(a - b) < CICLO_VISITA_DIAS * 86400000
}
export function proximaFechaDisponible(ultimaVisita: string | null, fechasAsignadas: string[]): string | null {
  const fechas = [ultimaVisita, ...fechasAsignadas].filter((date): date is string => Boolean(date)).sort()
  return fechas.length ? sumarDiasCiviles(fechas[fechas.length - 1], CICLO_VISITA_DIAS) : null
}
