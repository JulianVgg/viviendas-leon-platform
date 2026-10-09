
import {
  openOfflineDb,
  PENDING_OPERATIONS_STORE,
} from '@/db/offlineDb'

export type PendingOperation<T = unknown> = {
  id: string
  kind: string
  payload: T
  status: 'pending'
  createdAt: string
}

export async function queueOfflineOperation<T>(
  kind: string,
  payload: T,
): Promise<PendingOperation<T>> {
  if (!kind.trim()) {
    throw new Error('Debes indicar el tipo de operación.')
  }

  const operation: PendingOperation<T> = {
    id: crypto.randomUUID(),
    kind,
    payload,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  const db = await openOfflineDb()

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(
        PENDING_OPERATIONS_STORE,
        'readwrite',
      )

      transaction
        .objectStore(PENDING_OPERATIONS_STORE)
        .add(operation)

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(
        transaction.error ??
        new Error('Error al guardar la operación.'),
      )
      transaction.onabort = () => reject(
        transaction.error ??
        new Error('Se canceló el almacenamiento.'),
      )
    })

    return operation
  } finally {
    db.close()
  }
}

export async function listPendingOperations():
  Promise<PendingOperation[]> {
  const db = await openOfflineDb()

  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(
        PENDING_OPERATIONS_STORE,
        'readonly',
      )

      const request = transaction
        .objectStore(PENDING_OPERATIONS_STORE)
        .getAll()

      transaction.oncomplete = () => {
        const operations = request.result as PendingOperation[]

        resolve(
          operations.sort((a, b) =>
            a.createdAt.localeCompare(b.createdAt),
          ),
        )
      }

      transaction.onerror = () => reject(
        transaction.error ??
        new Error('Error al consultar pendientes.'),
      )
      transaction.onabort = () => reject(
        transaction.error ??
        new Error('Se canceló la consulta.'),
      )
    })
  } finally {
    db.close()
  }
}
