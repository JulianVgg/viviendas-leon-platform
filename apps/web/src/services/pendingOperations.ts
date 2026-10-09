import {
  openOfflineDb,
  PENDING_OPERATIONS_STORE,
} from '@/db/offlineDb'

export type OperationStatus = 'pending' | 'syncing' | 'failed' | 'synced'
export type SyncSource = 'server' | 'simulation'

export type PendingOperation<T = unknown> = {
  id: string
  kind: string
  payload: T
  status: OperationStatus
  createdAt: string
  attempts?: number
  lastAttemptAt?: string
  lastError?: string
  syncedAt?: string
  syncSource?: SyncSource
}

export type SyncAcknowledgment = {
  operationId: string
  accepted: true
}

export type OperationProcessor = (
  operation: PendingOperation,
) => Promise<SyncAcknowledgment>

function isOutstanding(operation: PendingOperation) {
  return operation.status !== 'synced'
}

function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Error desconocido al procesar la operación.'
}

export async function queueOfflineOperation<T>(
  kind: string,
  payload: T,
): Promise<PendingOperation<T>> {
  if (!kind.trim()) throw new Error('Debes indicar el tipo de operación.')

  const operation: PendingOperation<T> = {
    id: crypto.randomUUID(),
    kind,
    payload,
    status: 'pending',
    createdAt: new Date().toISOString(),
    attempts: 0,
  }

  const db = await openOfflineDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PENDING_OPERATIONS_STORE, 'readwrite')
      tx.objectStore(PENDING_OPERATIONS_STORE).add(operation)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('No se pudo guardar.'))
      tx.onabort = () => reject(tx.error ?? new Error('Guardado cancelado.'))
    })
    return operation
  } finally {
    db.close()
  }
}

export async function listQueueOperations(): Promise<PendingOperation[]> {
  const db = await openOfflineDb()
  try {
    return await new Promise<PendingOperation[]>((resolve, reject) => {
      const tx = db.transaction(PENDING_OPERATIONS_STORE, 'readonly')
      const req = tx.objectStore(PENDING_OPERATIONS_STORE).getAll()
      tx.oncomplete = () => resolve(
        (req.result as PendingOperation[]).sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt),
        ),
      )
      tx.onerror = () => reject(tx.error ?? new Error('No se pudo consultar la cola.'))
      tx.onabort = () => reject(tx.error ?? new Error('Consulta cancelada.'))
    })
  } finally {
    db.close()
  }
}

// Mantiene la función que ya consume la pantalla de OFF-03.
export async function listPendingOperations(): Promise<PendingOperation[]> {
  return (await listQueueOperations()).filter(isOutstanding)
}

// Actualización atómica: dos pestañas no pueden reclamar el mismo registro a la vez.
async function updateOperation(
  id: string,
  change: (current: PendingOperation) => PendingOperation | null,
): Promise<PendingOperation | null> {
  const db = await openOfflineDb()
  try {
    return await new Promise<PendingOperation | null>((resolve, reject) => {
      const tx = db.transaction(PENDING_OPERATIONS_STORE, 'readwrite')
      const store = tx.objectStore(PENDING_OPERATIONS_STORE)
      const req = store.get(id)
      let updated: PendingOperation | null = null

      req.onsuccess = () => {
        const current = req.result as PendingOperation | undefined
        if (current) {
          updated = change(current)
          if (updated) store.put(updated)
        }
      }
      tx.oncomplete = () => resolve(updated)
      tx.onerror = () => reject(tx.error ?? new Error('Error actualizando la operación.'))
      tx.onabort = () => reject(tx.error ?? new Error('Actualización cancelada.'))
    })
  } finally {
    db.close()
  }
}

export async function processQueueOperation(
  id: string,
  processor: OperationProcessor,
  source: SyncSource = 'server',
): Promise<PendingOperation> {
  const claimed = await updateOperation(id, (current) => {
    if (current.status !== 'pending' && current.status !== 'failed') return null
    return {
      ...current,
      status: 'syncing',
      attempts: (current.attempts ?? 0) + 1,
      lastAttemptAt: new Date().toISOString(),
      lastError: undefined,
    }
  })

  if (!claimed) throw new Error('La operación no está pendiente o ya se está procesando.')

  try {
    const acknowledgment = await processor(claimed)
    if (acknowledgment.accepted !== true || acknowledgment.operationId !== id) {
      throw new Error('El servidor no confirmó esta operación.')
    }

    const synced = await updateOperation(id, (current) =>
      current.status !== 'syncing' ? null : {
        ...current,
        status: 'synced',
        syncedAt: new Date().toISOString(),
        syncSource: source,
        lastError: undefined,
      },
    )

    if (!synced) throw new Error('No se pudo confirmar la operación localmente.')
    return synced
  } catch (cause) {
    const failed = await updateOperation(id, (current) =>
      current.status !== 'syncing' ? null : {
        ...current,
        status: 'failed',
        lastError: errorMessage(cause),
      },
    )

    if (!failed) throw new Error('No se pudo registrar el error de la operación.')
    return failed
  }
}

// Si una pestaña se cierra durante el procesamiento, la operación no debe
// quedar en estado "syncing" indefinidamente. Solo recupera intentos antiguos.
export async function recoverInterruptedOperations(
  olderThanMs = 5 * 60 * 1000,
): Promise<number> {
  const operations = await listQueueOperations()
  let recovered = 0
  for (const operation of operations) {
    if (operation.status !== 'syncing') continue
    const timestamp = Date.parse(operation.lastAttemptAt ?? operation.createdAt)
    if (Number.isFinite(timestamp) && Date.now() - timestamp < olderThanMs) continue
    const result = await updateOperation(operation.id, (current) =>
      current.status !== 'syncing' ? null : {
        ...current,
        status: 'failed',
        lastError: 'Intento interrumpido. Verifica el servidor antes de reintentar.',
      },
    )
    if (result) recovered += 1
  }
  return recovered
}
