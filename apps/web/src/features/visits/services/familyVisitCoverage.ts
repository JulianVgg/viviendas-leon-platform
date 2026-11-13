import type { Garden } from '@/features/agriculture/services/gardens'
import type { VisitListItem } from './visitService'
import type { FamilyVisitPlanning } from './visitPlanning'

export type CoverageStatus = 'pendiente' | 'vencida' | 'agendada' | 'realizada'
export type CoverageFilter = 'faltan' | 'todas' | CoverageStatus
export type FamilyCoverageRow = {
  familyId: number
  name: string
  community: string
  familyState: string
  status: CoverageStatus
  scheduledDate: string | null
  overdueDate: string | null
  lastCompleted: string | null
}

const sortOrder: Record<CoverageStatus, number> = { pendiente: 0, vencida: 1, agendada: 2, realizada: 3 }
function shiftCivilDate(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00Z`)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10)
}

/** Un registro por familia, incluso si tiene varios huertos. El ciclo comprende los últimos ocho días. */
export function buildFamilyVisitCoverage(
  gardens: Garden[], planning: FamilyVisitPlanning[], visits: VisitListItem[], today: string,
): FamilyCoverageRow[] {
  const unique = new Map<number, Garden>()
  for (const garden of gardens) {
    if (garden.estado !== 'ACTIVO' || unique.has(garden.familiaId)) continue
    unique.set(garden.familiaId, garden)
  }
  const info = new Map(planning.map(row => [row.familyId, row]))
  const byFamily = new Map<number, VisitListItem[]>()
  for (const visit of visits) {
    byFamily.set(visit.familyId, [...(byFamily.get(visit.familyId) ?? []), visit])
  }
  const start = shiftCivilDate(today, -7)
  return [...unique.values()].map(garden => {
    const familyVisits = byFamily.get(garden.familiaId) ?? []
    const record = info.get(garden.familiaId)
    const completedDates = [record?.lastCompleted ?? '', ...familyVisits.filter(v => v.status === 'REALIZADA').map(v => v.date)]
      .filter(date => date >= start && date <= today).sort()
    const future = [...(record?.scheduled ?? []).map(v => v.date),
      ...familyVisits.filter(v => v.status === 'PROGRAMADA').map(v => v.date)]
      .filter(date => date >= today).sort()[0] ?? null
    const overdue = [...(record?.scheduled ?? []).map(v => v.date),
      ...familyVisits.filter(v => v.status === 'PROGRAMADA').map(v => v.date)]
      .filter(date => date < today).sort().at(-1) ?? null
    const status: CoverageStatus = completedDates.length ? 'realizada' : future ? 'agendada' : overdue ? 'vencida' : 'pendiente'
    return {
      familyId: garden.familiaId,
      name: garden.familia.nombreReferencia,
      community: garden.familia.comunidad.nombre,
      familyState: garden.familia.estado,
      status, scheduledDate: future, overdueDate: overdue,
      lastCompleted: completedDates.at(-1) ?? record?.lastCompleted ?? null,
    }
  }).sort((a, b) => sortOrder[a.status] - sortOrder[b.status] || a.name.localeCompare(b.name, 'es'))
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim()
}
export function filterFamilyVisitCoverage(rows: FamilyCoverageRow[], filter: CoverageFilter, search: string): FamilyCoverageRow[] {
  const needle = normalize(search)
  return rows.filter(row => (filter === 'todas' || (filter === 'faltan' ? row.status === 'pendiente' || row.status === 'vencida' : row.status === filter)) &&
    (!needle || normalize(`${row.name} ${row.community}`).includes(needle)))
}
