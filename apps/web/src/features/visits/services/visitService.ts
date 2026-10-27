import type { ConfigRecordatorios } from '@/features/notifications/services/remindersService'
import { getOfflineData, saveOfflineData } from '@/db/offlineDb'
import { getConnectivitySnapshot } from '@/services/connectivity'
import { listQueueOperations, processQueueOperation, queueOfflineOperation, recoverInterruptedOperations, type PendingOperation, type SyncAcknowledgment } from '@/services/pendingOperations'

export const VISIT_SYNC_KIND = 'visits.create.v1'
export const MAX_VISIT_PHOTOS = 4
export const MAX_VISIT_PHOTO_BYTES = 2 * 1024 * 1024
export type FollowUpStatus = 'PENDIENTE' | 'CUMPLIDO' | 'NO_CUMPLIDO'
export type RescheduleHistory = { id: number; oldDate: string | null; newDate: string; actorId: number; reason: string | null; at: string }
export function todayInGuatemala(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}
export type VisitTimeSlot = 'MANANA' | 'TARDE'
export type VisitFollowUp = { id: string; sourceVisitId: number | null; responsibleUserId?: number; familyId: number; familyName: string; community: string; date: string; text: string; category: 'Familia' | 'ONG'; due: string | null; nextVisit?: boolean; status: FollowUpStatus; observation?: string | null; local?: boolean; reprogramaciones?: RescheduleHistory[] }
export type FollowUpReview = { id: string; status: FollowUpStatus }
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
  familyId: number; date: string; status: 'PROGRAMADA' | 'REALIZADA'; capturedAt?: string; timeSlot?: VisitTimeSlot
  recordatorios?: ConfigRecordatorios // Configuración viaja con la operación offline.
  scheduledVisitId?: number // Si se completa una cita, conserva el mismo ID de la visita.
  weather: string; checkIn: string; crops: CropCapture[]
  recommendation: string; treatment: string; observations: string
  commitments: { id: string; text: string; category: 'Familia' | 'ONG'; due: string | null; nextVisit?: boolean }[]
  reviews: FollowUpReview[]
  programacion?: { date: string; timeSlot?: VisitTimeSlot; operationId?: string }
}
type OwnedVisitCapture = { ownerId: number; familyName: string; community: string; capture: VisitCapture; photos?: VisitPhotoFile[] }
export type VisitListItem = {
  id: number | null; operationId: string | null; date: string; status: string; responsibleName?: string; responsibleUserId?: number
  familyId: number; familyName: string; community: string
  capture: VisitCapture | null; evidences?: VisitEvidence[]; localPhotos?: VisitPhotoFile[]
  reprogramaciones?: RescheduleHistory[]
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
  // Una cita sincronizada cuyo UUID fue reemplazado al marcarla como REALIZADA
  // ya no debe reaparecer como segundo registro en el historial conectado.
  const extras = candidates.filter(o => !syncedIds.has(o.id) && (local || o.status !== 'synced')).map(o => {
    const p = o.payload as OwnedVisitCapture
    return {
      id: null, operationId: o.id, date: p.capture.date, status: p.capture.status, responsibleUserId: userId,
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
    const detail = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(detail?.error ?? `No se pudo sincronizar la visita (HTTP ${response.status}).`)
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
  // No incorporar citas retroactivas a la cola offline. Las visitas REALIZADAS
  // capturadas anteriormente mantienen su proceso de sincronización original.
  if (capture.status === 'PROGRAMADA' && capture.date < todayInGuatemala()) {
    throw new Error('No puedes agendar visitas en fechas anteriores a hoy.')
  }
  if (photos.length > MAX_VISIT_PHOTOS || photos.some(photo => photo.blob.type !== 'image/jpeg' || photo.blob.size > MAX_VISIT_PHOTO_BYTES)) {
    throw new Error('Las fotos no cumplen los límites admitidos.')
  }
  // Una única operación durable garantiza que visita y fotos se conserven juntas en IndexedDB.
  const operation = await queueOfflineOperation(VISIT_SYNC_KIND, { ownerId: userId, familyName, community, capture, photos } satisfies OwnedVisitCapture)
  if (getConnectivitySnapshot().status === 'connected') await syncPendingVisits(userId)
  const updated = (await listQueueOperations()).find(o => o.id === operation.id)
  return { status: updated?.status === 'synced' ? 'synced' : updated?.status === 'failed' ? 'failed' : 'pending', id: operation.id }
}

// La agenda consulta la tabla de seguimientos; IndexedDB mantiene copia para trabajo de campo.
const followUpCacheKey = (userId: number) => `visits:followups:v1:user:${userId}`
export async function getVisitFollowUps(userId: number): Promise<{ items: VisitFollowUp[]; local: boolean }> {
  let items: VisitFollowUp[] = []
  let local = false
  try {
    const response = await fetch('/api/v1/visitas/seguimientos', { credentials: 'same-origin', cache: 'no-store' })
    if ([401, 403].includes(response.status)) throw new Error('Sesión no autorizada.')
    if (!response.ok) throw new Error('No se pudieron consultar los seguimientos.')
    const body = await response.json() as { data: VisitFollowUp[] }
    items = body.data
    try { await saveOfflineData(followUpCacheKey(userId), items) } catch { /* caché opcional */ }
  } catch (err) {
    if (err instanceof Error && err.message === 'Sesión no autorizada.') throw err
    local = true
    items = (await getOfflineData<VisitFollowUp[]>(followUpCacheKey(userId)))?.data ?? []
  }
  const queue = await listQueueOperations()
  const own = queue.filter(o => o.kind === VISIT_SYNC_KIND && (o.payload as OwnedVisitCapture | undefined)?.ownerId === userId)
  const merged = new Map(items.map(item => [item.id, item]))
  for (const operation of own) {
    const payload = operation.payload as OwnedVisitCapture
    if (operation.status !== 'synced') {
      for (const commitment of payload.capture.commitments ?? []) {
        if (!commitment.id || merged.has(commitment.id)) continue
        merged.set(commitment.id, {
          id: commitment.id, responsibleUserId: userId, familyId: payload.capture.familyId,
          familyName: payload.familyName, community: payload.community,
          sourceVisitId: null, date: payload.capture.date, text: commitment.text,
          category: commitment.category, due: commitment.due, nextVisit: commitment.nextVisit ?? false, status: 'PENDIENTE', local: true,
        })
      }
    }
    // Revisiones aún no sincronizadas deben reflejarse en la consulta offline.
    if (operation.status !== 'synced') for (const review of payload.capture.reviews ?? []) {
      const current = merged.get(review.id)
      if (current) merged.set(review.id, { ...current, status: review.status, local: true })
    }
  }
  return { items: [...merged.values()], local }
}

export async function updateVisitFollowUp(id: string, changes: Pick<VisitFollowUp, 'status' | 'text' | 'due' | 'observation'> & { reprogramar?: boolean; reason?: string }): Promise<void> {
  const response = await fetch(`/api/v1/visitas/seguimientos/${encodeURIComponent(id)}`, {
    method: 'PATCH', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify(changes),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(body?.error ?? `No se pudo actualizar el seguimiento (HTTP ${response.status}).`)
  }
  // Invalidar cachés sería contraproducente sin red. La agenda/formulario
  // releerán desde el servidor al volver a enfocarse.
}

export async function rescheduleVisit(visitId: number, date: string, reason = ''): Promise<void> {
  const response = await fetch(`/api/v1/visitas/agenda/${visitId}`, {
    method: 'PATCH', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify({ date, reason }),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(payload?.error ?? `No se pudo cambiar la fecha (HTTP ${response.status}).`)
  }
}

// Solo se elimina una visita PROGRAMADA y sincronizada en el servidor.
export async function deleteScheduledVisit(visitId: number): Promise<void> {
  const response = await fetch(`/api/v1/visitas/agenda/${visitId}`, {
    method: 'DELETE', credentials: 'same-origin', cache: 'no-store',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(payload?.error ?? `No se pudo eliminar la visita (HTTP ${response.status}).`)
  }
}
