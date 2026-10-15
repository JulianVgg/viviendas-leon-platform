import { getOfflineData, saveOfflineData } from '@/db/offlineDb'
import { getConnectivitySnapshot } from '@/services/connectivity'
import { listQueueOperations, processQueueOperation, queueOfflineOperation, recoverInterruptedOperations, type PendingOperation, type SyncAcknowledgment } from '@/services/pendingOperations'

export const VISIT_SYNC_KIND = 'visits.create.v1'
export type CropCapture = {
  name: string; stage: string; quality: string; plants: number | null
  findings: { type: 'plaga' | 'enfermedad'; name: string; damage: string }[]
  production: boolean; perPlantUnits: number | null; perPlantKg: number | null
  units: number | null; kg: number | null; priceQ: number | null; priceUSD: number | null
  priceBasis: 'unidad' | 'kg'
}
export type VisitCapture = {
  familyId: number; date: string; status: 'PROGRAMADA' | 'REALIZADA'
  weather: string; checkIn: string; crops: CropCapture[]
  recommendation: string; treatment: string; observations: string
  commitments: { text: string; category: 'Familia' | 'ONG'; due: string | null }[]
}
type OwnedVisitCapture = { ownerId: number; familyName: string; community: string; capture: VisitCapture }
export type VisitListItem = {
  id: number | null; operationId: string | null; date: string; status: string
  familyId: number; familyName: string; community: string
  capture: VisitCapture | null; syncStatus?: 'pending' | 'syncing' | 'failed' | 'synced'
}

const cacheKey = (userId: number) => `visits:list:v1:user:${userId}`

export async function getVisitList(userId: number): Promise<{ items: VisitListItem[]; local: boolean }> {
  let rows: VisitListItem[] = []
  let local = false
  try {
    const response = await fetch('/api/v1/visitas', { cache: 'no-store', credentials: 'same-origin', headers: { Accept:'application/json' } })
    if (response.status === 401 || response.status === 403) throw new Error('Sesión no autorizada.')
    if (!response.ok) throw new Error('No se pudo consultar el historial.')
    const body = await response.json() as { data: VisitListItem[] }
    rows = body.data
    try { await saveOfflineData(cacheKey(userId), rows) } catch { /* no bloquear la consulta remota */ }
  } catch (error) {
    if (error instanceof Error && error.message === 'Sesión no autorizada.') throw error
    local = true
    const stored = await getOfflineData<VisitListItem[]>(cacheKey(userId))
    rows = stored?.data ?? []
  }
  const queued = await listQueueOperations()
  const candidates = queued.filter(o => o.kind === VISIT_SYNC_KIND && (o.payload as OwnedVisitCapture | undefined)?.ownerId === userId)
  const syncedIds = new Set(rows.map(r => r.operationId))
  const extras = candidates.filter(o => !syncedIds.has(o.id)).map(o => {
    const p = o.payload as OwnedVisitCapture
    return {
      id: null, operationId: o.id, date: p.capture.date, status: p.capture.status,
      familyId: p.capture.familyId, familyName: p.familyName, community: p.community,
      capture: p.capture, syncStatus: o.status,
    } satisfies VisitListItem
  })
  return { items: [...rows, ...extras].sort((a,b)=>b.date.localeCompare(a.date)), local }
}

async function sendVisit(operation: PendingOperation): Promise<SyncAcknowledgment> {
  const p = operation.payload as OwnedVisitCapture
  const response = await fetch('/api/v1/visitas/sync', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type':'application/json', Accept:'application/json', 'X-Requested-With':'XMLHttpRequest' },
    body: JSON.stringify({ operationId: operation.id, kind: VISIT_SYNC_KIND, payload: p.capture }),
  })
  if (!response.ok) {
    if (response.status === 401) throw new Error('Inicia sesión para sincronizar.')
    throw new Error(`No se pudo sincronizar (HTTP ${response.status}).`)
  }
  const result = await response.json() as { operationId?: string; accepted?: boolean }
  if (result.operationId !== operation.id || result.accepted !== true) throw new Error('El servidor no confirmó la visita.')
  return { operationId: operation.id, accepted: true }
}

let active: Promise<void> | null = null
export function syncPendingVisits(userId: number): Promise<void> {
  if (active) return active
  active = (async () => {
    if (getConnectivitySnapshot().status !== 'connected') return
    await recoverInterruptedOperations()
    const operations = await listQueueOperations()
    for (const op of operations) {
      if (getConnectivitySnapshot().status !== 'connected') break
      if (op.kind !== VISIT_SYNC_KIND || !['pending','failed'].includes(op.status)) continue
      if ((op.payload as OwnedVisitCapture | undefined)?.ownerId !== userId) continue
      try { await processQueueOperation(op.id, sendVisit, 'server') } catch { /* reclamación concurrente */ }
    }
  })().finally(() => { active = null })
  return active
}

export async function saveVisitCapture(userId: number, familyName: string, community: string, capture: VisitCapture): Promise<{ status: 'synced' | 'pending' | 'failed'; id: string }> {
  const operation = await queueOfflineOperation(VISIT_SYNC_KIND, { ownerId: userId, familyName, community, capture } satisfies OwnedVisitCapture)
  if (getConnectivitySnapshot().status === 'connected') await syncPendingVisits(userId)
  const updated = (await listQueueOperations()).find(o => o.id === operation.id)
  return { status: updated?.status === 'synced' ? 'synced' : updated?.status === 'failed' ? 'failed' : 'pending', id: operation.id }
}
