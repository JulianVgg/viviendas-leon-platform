import { getOfflineData, saveOfflineData } from '@/db/offlineDb'

export const DIAS_CICLO_VISITA = 8
export type FamilyVisitPlanning = {
  familyId: number
  lastCompleted: string | null
  scheduled: { id: number; date: string; responsibleName: string; responsibleUserId: number }[]
}
const cacheKey = (userId: number) => `visits:planning:v1:user:${userId}`

export function addCivilDays(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || !Number.isInteger(days)) throw new Error('Fecha inválida.')
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10)
}

export async function getVisitPlanning(userId: number): Promise<{ rows: FamilyVisitPlanning[]; local: boolean }> {
  try {
    const response = await fetch('/api/v1/visitas/planificacion', { credentials: 'same-origin', cache: 'no-store' })
    if (response.status === 401 || response.status === 403) throw new Error('Acceso no autorizado.')
    if (!response.ok) throw new Error('No se pudo consultar la planificación.')
    const body = await response.json() as { data: FamilyVisitPlanning[] }
    void saveOfflineData(cacheKey(userId), body.data).catch(() => {})
    return { rows: body.data, local: false }
  } catch (error) {
    if (error instanceof Error && error.message === 'Acceso no autorizado.') throw error
    return { rows: (await getOfflineData<FamilyVisitPlanning[]>(cacheKey(userId)))?.data ?? [], local: true }
  }
}

export function visitsSameCycle(a: string, b: string): boolean {
  const aDate = Date.parse(`${a}T12:00:00Z`)
  const bDate = Date.parse(`${b}T12:00:00Z`)
  return Number.isFinite(aDate) && Number.isFinite(bDate) && Math.abs(aDate - bDate) < DIAS_CICLO_VISITA * 86400000
}
export function suggestedNextVisit(lastCompleted: string | null, scheduled: string[]): string | null {
  const dates = [lastCompleted, ...scheduled].filter((date): date is string => Boolean(date)).sort()
  return dates.length ? addCivilDays(dates[dates.length - 1], DIAS_CICLO_VISITA) : null
}
