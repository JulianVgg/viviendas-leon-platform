/** Regla de disponibilidad de siembras al registrar una visita técnica. */
type CycleForVisit = {
  estado: string
  fechaSiembra: string | null
  fechaTrasplante: string | null
  fechaFin: string | null
  huerto: { familiaId: number; estado: string }
  cultivo: { activo: boolean }
}

/**
 * Si existe fecha de siembra, el cultivo puede evaluarse desde esa fecha,
 * aunque el trasplante todavía no haya ocurrido. Si no hay siembra,
 * el trasplante es la referencia de inicio.
 */
export function isVisitCycleAvailable(cycle: CycleForVisit, familyId: number, visitDate: string): boolean {
  const startDate = cycle.fechaSiembra ?? cycle.fechaTrasplante
  return cycle.estado === 'ACTIVO' && cycle.huerto.familiaId === familyId &&
    cycle.huerto.estado === 'ACTIVO' && cycle.cultivo.activo &&
    !!startDate && startDate <= visitDate &&
    (!cycle.fechaFin || cycle.fechaFin >= visitDate)
}
