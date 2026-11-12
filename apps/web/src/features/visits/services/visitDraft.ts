import { clearFieldSessionKey, deleteOfflineData, getOfflineData, saveOfflineData } from '@/db/offlineDb'
import { fieldAccessActive } from '@/features/auth/services/fieldAccess'
import type { VisitPhotoFile } from './visitService'

// Contenido cifrado con la clave de campo del usuario. Sin clave desbloqueada
// no se permite persistir un borrador con información personal.
const draftKey = (userId: number) => `visits:draft:v1:user:${userId}`
const photosKey = (userId: number) => `visits:draft-photos:v1:user:${userId}`

type PhotoRecord = { id: string; name: string; type: string; base64: string }
const pendingWrites = new Map<number, Promise<void>>()
const generations = new Map<number, number>()
const generation = (userId: number) => generations.get(userId) ?? 0
function serial(userId: number, job: () => Promise<void>): Promise<void> {
  const previous = pendingWrites.get(userId) ?? Promise.resolve()
  const current = previous.catch(() => {}).then(job)
  pendingWrites.set(userId, current)
  void current.finally(() => { if (pendingWrites.get(userId) === current) pendingWrites.delete(userId) }).catch(() => {})
  return current
}

function encode(buffer: ArrayBuffer): string {
  const data = new Uint8Array(buffer)
  const parts: string[] = []
  for (let i = 0; i < data.length; i += 8192) {
    parts.push(String.fromCharCode(...data.subarray(i, i + 8192)))
  }
  return btoa(parts.join(''))
}
function decode(raw: string): ArrayBuffer {
  const str = atob(raw)
  const result = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) result[i] = str.charCodeAt(i)
  return result.buffer
}

export async function getVisitDraft<T>(userId: number): Promise<{ draft: T; photos: VisitPhotoFile[] } | null> {
  const record = await getOfflineData<T>(draftKey(userId))
  if (!record) return null
  const stored = await getOfflineData<PhotoRecord[]>(photosKey(userId))
  const photos = (stored?.data ?? []).map(photo => ({
    id: photo.id, name: photo.name, blob: new Blob([decode(photo.base64)], { type: photo.type }),
  }))
  return { draft: record.data, photos }
}
export async function saveVisitDraft<T>(userId: number, draft: T): Promise<void> {
  const revision = generation(userId)
  await serial(userId, () => revision === generation(userId)
    ? saveOfflineData(draftKey(userId), draft) : Promise.resolve())
}
export async function saveVisitDraftPhotos(userId: number, photos: VisitPhotoFile[]): Promise<void> {
  const revision = generation(userId)
  const files: PhotoRecord[] = await Promise.all(photos.map(async photo => ({
    id: photo.id, name: photo.name, type: photo.blob.type, base64: encode(await photo.blob.arrayBuffer()),
  })))
  await serial(userId, () => revision === generation(userId)
    ? saveOfflineData(photosKey(userId), files) : Promise.resolve())
}
export async function clearVisitDraft(userId: number): Promise<void> {
  generations.set(userId, generation(userId) + 1)
  await serial(userId, async () => {
    // Nunca borrar un borrador cifrado de una sesión anterior si la clave
    // todavía no fue desbloqueada. Solo limpiar los datos temporales.
    if (!fieldAccessActive(userId)) {
      clearFieldSessionKey(draftKey(userId))
      clearFieldSessionKey(photosKey(userId))
      return
    }
    await Promise.all([deleteOfflineData(draftKey(userId)), deleteOfflineData(photosKey(userId))])
  })
}
