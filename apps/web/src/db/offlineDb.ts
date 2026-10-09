
const DB_NAME = 'viviendas-leon-offline'
const DB_VERSION = 2
const STORE_NAME = 'essential-data'

export const PENDING_OPERATIONS_STORE = 'pending-operations'

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

export async function saveOfflineData<T>(
  key: string,
  data: T,
): Promise<void> {
  const db = await openOfflineDb()

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(
        STORE_NAME,
        'readwrite',
      )

      transaction.objectStore(STORE_NAME).put({
        key,
        data,
        savedAt: new Date().toISOString(),
      })

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

export async function getOfflineData<T>(
  key: string,
): Promise<OfflineRecord<T> | null> {
  const db = await openOfflineDb()

  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(
        STORE_NAME,
        'readonly',
      )

      const request = transaction
        .objectStore(STORE_NAME)
        .get(key)

      request.onsuccess = () => {
        resolve(
          (request.result as OfflineRecord<T> | undefined)
            ?? null,
        )
      }

      request.onerror = () => reject(request.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}
