/** Regla de disponibilidad de siembras al registrar una visita técnica. */
type CycleForVisit = {
  estado: string
  fechaSiembra: string | null
  fechaTrasplante: string | null
  fechaFin: string | null
  huerto: { familiaId: number; estado: string }
  cultivo: { activo: boolean }
}

/** Una siembra solo puede evaluarse desde su fecha de inicio registrada. */
export function isVisitCycleAvailable(cycle: CycleForVisit, familyId: number, visitDate: string): boolean {
  const startDate = cycle.fechaSiembra
  return cycle.estado === 'ACTIVO' && cycle.huerto.familiaId === familyId &&
    cycle.huerto.estado === 'ACTIVO' && cycle.cultivo.activo &&
    !!startDate && startDate <= visitDate &&
    (!cycle.fechaFin || cycle.fechaFin >= visitDate)
}
