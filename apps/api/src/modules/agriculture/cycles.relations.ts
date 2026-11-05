/** CIR-04: reglas puras de integridad; sin operaciones de base de datos. */
export type PlantingReference = {
  huertoId: number
  cultivoId: number
  fechaSiembra: string | null
  fechaTrasplante: string | null
}

export function plantingDates(day: string | null): Date | null {
  return day ? new Date(`${day}T00:00:00.000Z`) : null
}

/** Dos lotes de la misma variedad, en fechas distintas, sí son válidos. */
export function duplicatePlantingFilter(input: PlantingReference) {
  return {
    huertoId: input.huertoId,
    cultivoId: input.cultivoId,
    fechaSiembra: plantingDates(input.fechaSiembra),
    fechaTrasplante: plantingDates(input.fechaTrasplante),
  }
}

type CycleForVisit = {
  estado: string
  fechaSiembra: Date | null
  fechaTrasplante: Date | null
  fechaFin: Date | null
  huerto: { familiaId: number; estado: string }
  cultivo: { nombre: string; activo: boolean }
}

function day(value: Date | null): string | null {
  return value?.toISOString().slice(0, 10) ?? null
}

/**
 * El vínculo debe apuntar al ciclo de esta familia, activo y ya iniciado en la
 * fecha de la visita. Se preservan evaluaciones históricas; solo se validan altas.
 */
export function visitCycleProblem(cycle: CycleForVisit | null, input: {
  familiaId: number
  fechaVisita: string
  nombreCultivo: string
}): string | null {
  if (!cycle) return 'CYCLE_NOT_FOUND'
  if (cycle.huerto.familiaId !== input.familiaId) return 'OTHER_FAMILY'
  if (cycle.huerto.estado !== 'ACTIVO') return 'INACTIVE_GARDEN'
  if (cycle.estado !== 'ACTIVO') return 'INACTIVE_CYCLE'
  if (!cycle.cultivo.activo) return 'INACTIVE_CROP'
  if (cycle.cultivo.nombre !== input.nombreCultivo) return 'CROP_MISMATCH'
  const start = [day(cycle.fechaSiembra), day(cycle.fechaTrasplante)]
    .filter((date): date is string => date !== null).sort().at(-1)
  if (!start || start > input.fechaVisita) return 'NOT_PLANTED_YET'
  if (cycle.fechaFin && day(cycle.fechaFin)! < input.fechaVisita) return 'CYCLE_ENDED'
  return null
}
