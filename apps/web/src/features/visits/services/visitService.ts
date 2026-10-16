import { getOfflineData, saveOfflineData } from '@/db/offlineDb'
import { getConnectivitySnapshot } from '@/services/connectivity'
import { listQueueOperations, processQueueOperation, queueOfflineOperation, recoverInterruptedOperations, type PendingOperation, type SyncAcknowledgment } from '@/services/pendingOperations'

export const VISIT_SYNC_KIND = 'visits.create.v1'
export const MAX_VISIT_PHOTOS = 4
export const MAX_VISIT_PHOTO_BYTES = 2 * 1024 * 1024
export type VisitPhotoFile = { id: string; name: string; blob: Blob }
export type VisitEvidence = { id: number; name: string; url: string }
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
type OwnedVisitCapture = { ownerId: number; familyName: string; community: string; capture: VisitCapture; photos?: VisitPhotoFile[] }
export type VisitListItem = {
  id: number | null; operationId: string | null; date: string; status: string
  familyId: number; familyName: string; community: string
  capture: VisitCapture | null; evidences?: VisitEvidence[]; localPhotos?: VisitPhotoFile[]
  syncStatus?: 'pending' | 'syncing' | 'failed' | 'synced'
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
  const queueById = new Map(candidates.map(o => [o.id, o]))
  rows = rows.map(row => {
    const operation = row.operationId ? queueById.get(row.operationId) : undefined
    const outstanding = operation && operation.status !== 'synced'
    return {
      ...row,
      // Sincronizada: usar la foto servida por la API y no una vista previa local.
      // Sin conexión: conservar la foto de IndexedDB si el caché no tiene imágenes.
      localPhotos: outstanding || (local && !row.evidences?.length)
        ? (operation?.payload as OwnedVisitCapture | undefined)?.photos
        : undefined,
      syncStatus: outstanding ? operation.status : undefined,
    }
  })
  const syncedIds = new Set(rows.map(r => r.operationId))
  const extras = candidates.filter(o => !syncedIds.has(o.id)).map(o => {
    const p = o.payload as OwnedVisitCapture
    return {
      id: null, operationId: o.id, date: p.capture.date, status: p.capture.status,
      familyId: p.capture.familyId, familyName: p.familyName, community: p.community,
      capture: p.capture, localPhotos: p.photos, syncStatus: o.status,
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
    throw new Error(`No se pudo sincronizar la visita (HTTP ${response.status}).`)
  }
  const result = await response.json() as { operationId?: string; accepted?: boolean }
  if (result.operationId !== operation.id || result.accepted !== true) throw new Error('El servidor no confirmó la visita.')

  // Las fotos van como bytes binarios en peticiones separadas; no se incluyen en el JSON.
  // Si falla cualquier foto, la misma operación se reintenta con el mismo UUID y la API evita duplicados.
  for (const photo of p.photos ?? []) {
    const uploaded = await fetch(`/api/v1/visitas/${operation.id}/evidencias/${photo.id}`, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'image/jpeg', 'X-Requested-With': 'XMLHttpRequest', 'X-File-Name': encodeURIComponent(photo.name) },
      body: photo.blob,
    })
    if (!uploaded.ok) throw new Error(`No se pudo sincronizar la foto ${photo.name} (HTTP ${uploaded.status}).`)
  }
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

export async function saveVisitCapture(userId: number, familyName: string, community: string, capture: VisitCapture, photos: VisitPhotoFile[] = []): Promise<{ status: 'synced' | 'pending' | 'failed'; id: string }> {
  if (photos.length > MAX_VISIT_PHOTOS || photos.some(photo => photo.blob.type !== 'image/jpeg' || photo.blob.size > MAX_VISIT_PHOTO_BYTES)) {
    throw new Error('Las fotos no cumplen los límites admitidos.')
  }
  // Una única operación durable garantiza que visita y fotos se conserven juntas en IndexedDB.
  const operation = await queueOfflineOperation(VISIT_SYNC_KIND, { ownerId: userId, familyName, community, capture, photos } satisfies OwnedVisitCapture)
  if (getConnectivitySnapshot().status === 'connected') await syncPendingVisits(userId)
  const updated = (await listQueueOperations()).find(o => o.id === operation.id)
  return { status: updated?.status === 'synced' ? 'synced' : updated?.status === 'failed' ? 'failed' : 'pending', id: operation.id }
}
