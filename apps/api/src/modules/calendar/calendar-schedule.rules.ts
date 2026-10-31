// Reglas puras de agenda institucional: intervalo semiabierto [inicio, fin).
// Una actividad de día completo ocupa el día; las visitas técnicas no bloquean horarios.
export type HorarioEvento = { horaInicio: string | null; horaFin: string | null }
const HHMM = /^(?:[01]\d|2[0-3]):[0-5]\d$/
export function interpretarHorario(todoElDia: unknown, inicio: unknown, fin: unknown): HorarioEvento | null {
  if (todoElDia === true || (todoElDia === undefined && inicio == null && fin == null)) {
    return { horaInicio: null, horaFin: null }
  }
  if (todoElDia !== false && todoElDia !== undefined) return null
  if (typeof inicio !== 'string' || typeof fin !== 'string' || !HHMM.test(inicio) || !HHMM.test(fin) || inicio >= fin) return null
  return { horaInicio: inicio, horaFin: fin }
}
export function horariosSeCruzan(a: HorarioEvento, b: HorarioEvento): boolean {
  if (!a.horaInicio || !a.horaFin || !b.horaInicio || !b.horaFin) return true
  return a.horaInicio < b.horaFin && b.horaInicio < a.horaFin
}
export function textoHorario(h: HorarioEvento): string {
  return h.horaInicio && h.horaFin ? `${h.horaInicio}–${h.horaFin}` : 'Todo el día'
}
