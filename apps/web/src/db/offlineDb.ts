
const DB_NAME = 'viviendas-leon-offline'
const DB_VERSION = 2
const STORE_NAME = 'essential-data'

// Solo se cifra información de campo que contiene el identificador del usuario.
const fieldOwner = (key: string) => {
  const match = /^visits:.*:user:(\d+)(?::|$)/.exec(key)
  return match ? Number(match[1]) : null
}

export const PENDING_OPERATIONS_STORE = 'pending-operations'

// Copia de sesión: datos autorizados disponibles durante cortes breves, sin
// escribir información personal sin cifrar al almacenamiento permanente.
const fieldSessionData = new Map<string, OfflineRecord<unknown>>()
export function clearFieldSessionData(): void { fieldSessionData.clear() }
export function clearFieldSessionKey(key: string): void { fieldSessionData.delete(key) }


export type OfflineRecord<T> = {
  key: string
  data: T
  savedAt: string
}

export function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      // OFF-02: Almacén para consultar información offline
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: 'key',
        })
      }

      // OFF-03: Almacén para registrar operaciones pendientes
      if (!db.objectStoreNames.contains(PENDING_OPERATIONS_STORE)) {
        db.createObjectStore(PENDING_OPERATIONS_STORE, {
          keyPath: 'id',
        })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveOfflineData<T>(key: string, data: T): Promise<void> {
  const userId = fieldOwner(key)
  // Sin clave local, guardar SOLO en memoria hasta cerrar esta pestaña/PWA.
  if (userId !== null) {
    const { fieldAccessActive } = await import('@/features/auth/services/fieldAccess')
    if (!fieldAccessActive(userId)) {
      fieldSessionData.set(key, { key, data, savedAt: new Date().toISOString() })
      return
    }
  }
  const value: unknown = userId === null ? data : await (await import('@/features/auth/services/fieldAccess')).encryptFieldData(userId, data)
  const db = await openOfflineDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put({ key, data: value, savedAt: new Date().toISOString() })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}

export async function getOfflineData<T>(key: string): Promise<OfflineRecord<T> | null> {
  const db = await openOfflineDb()
  let record: OfflineRecord<unknown> | null = null
  try {
    record = await new Promise<OfflineRecord<unknown> | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => resolve((req.result as OfflineRecord<unknown> | undefined) ?? null)
      req.onerror = () => reject(req.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
  const userId = fieldOwner(key)
  if (userId === null) return record as OfflineRecord<T> | null
  const { fieldAccessActive, decryptFieldData } = await import('@/features/auth/services/fieldAccess')
  if (record && fieldAccessActive(userId)) {
    const data = await decryptFieldData<T>(userId, record.data)
    if (data !== null) return { ...record, data }
  }
  // Nunca acceder sin clave a registros cifrados de una sesión anterior.
  return (fieldSessionData.get(key) as OfflineRecord<T> | undefined) ?? null
}

export async function deleteOfflineData(key: string): Promise<void> {
  fieldSessionData.delete(key)
  const db = await openOfflineDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}

/** Borra únicamente copias de visitas/familias que versiones anteriores dejaron
 * sin cifrar. NO toca la cola de operaciones pendientes ni PostgreSQL.
 */
export async function purgeLegacyFieldCaches(): Promise<void> {
  const db = await openOfflineDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) return
        const key = String(cursor.key)
        const record = cursor.value as OfflineRecord<unknown>
        if (fieldOwner(key) !== null && (!record.data || typeof record.data !== 'object' ||
          !('fieldEncrypted' in record.data))) cursor.delete()
        cursor.continue()
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}
