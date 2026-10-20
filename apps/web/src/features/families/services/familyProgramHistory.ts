import type { FamilyParticipationRecord } from '../types/familyIntegral'

// Los registros antiguos pueden tener estados nulos o personalizados.
// No deben clasificarse como finalizados sin una decisión institucional.
export type ParticipationFilter = 'TODOS' | 'ACTIVOS' | 'ANTERIORES' | 'OTROS'
export type ParticipationCategory = Exclude<ParticipationFilter, 'TODOS'>

export function participationCategory(estado: string | null): ParticipationCategory {
  const normalized = estado?.trim().toUpperCase()
  if (normalized === 'ACTIVO') return 'ACTIVOS'
  if (normalized === 'FINALIZADO' || normalized === 'RETIRADO') return 'ANTERIORES'
  return 'OTROS'
}

export function participationStateLabel(estado: string | null): string {
  if (!estado?.trim()) return 'Sin estado definido'
  const normalized = estado.trim().toUpperCase()
  if (normalized === 'ACTIVO') return 'Activo'
  if (normalized === 'FINALIZADO') return 'Finalizado'
  if (normalized === 'RETIRADO') return 'Retirado'
  return estado
}

function dayKey(value: string | null): string {
  const day = value?.slice(0, 10) ?? ''
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : ''
}

/** La fuente es el expediente de la familia consultada; nunca se mezcla con otros expedientes. */
export function orderParticipations<T extends Pick<FamilyParticipationRecord, 'id' | 'fechaIngreso'>>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    const dateA = dayKey(a.fechaIngreso)
    const dateB = dayKey(b.fechaIngreso)
    if (dateA !== dateB) return dateA > dateB ? -1 : 1
    return b.id - a.id
  })
}

export function participationSummary(rows: readonly Pick<FamilyParticipationRecord, 'estado'>[]) {
  const summary = { total: rows.length, activos: 0, anteriores: 0, otros: 0 }
  for (const row of rows) {
    const category = participationCategory(row.estado)
    if (category === 'ACTIVOS') summary.activos += 1
    else if (category === 'ANTERIORES') summary.anteriores += 1
    else summary.otros += 1
  }
  return summary
}

export function filterParticipations<T extends Pick<FamilyParticipationRecord, 'estado'>>(rows: readonly T[], filter: ParticipationFilter): T[] {
  return filter === 'TODOS' ? [...rows] : rows.filter((row) => participationCategory(row.estado) === filter)
}
