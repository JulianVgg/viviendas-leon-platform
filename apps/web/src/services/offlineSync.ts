import {
  listQueueOperations,
  processQueueOperation,
  recoverInterruptedOperations,
  type PendingOperation,
  type SyncAcknowledgment,
} from '@/services/pendingOperations'
import { getConnectivitySnapshot } from '@/services/connectivity'

export const DEMO_SYNC_KIND = 'demo.field-note.create'

export type SyncRunSummary = {
  attempted: number
  synced: number
  failed: number
  remaining: number
}

let inFlight: Promise<SyncRunSummary> | null = null

function demoPayload(operation: PendingOperation): { title: string; observation: string } {
  const data = operation.payload
  if (operation.kind !== DEMO_SYNC_KIND || !data || typeof data !== 'object') {
    throw new Error('El tipo de operación no está habilitado para sincronización.')
  }
  if (!('title' in data) || typeof data.title !== 'string' ||
      !('observation' in data) || typeof data.observation !== 'string') {
    throw new Error('La operación no contiene una anotación válida.')
  }
  return { title: data.title, observation: data.observation }
}

async function sendDemoNote(operation: PendingOperation): Promise<SyncAcknowledgment> {
  const response = await fetch('/api/v1/offline/demo-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      operationId: operation.id,
      kind: operation.kind,
      payload: demoPayload(operation),
    }),
  })
  if (!response.ok) throw new Error(`La API rechazó la operación (HTTP ${response.status}).`)

  // No confirmar localmente si el cuerpo HTTP está vacío o es inválido.
  const value: unknown = await response.json()
  if (!value || typeof value !== 'object' ||
      !('accepted' in value) || value.accepted !== true ||
      !('operationId' in value) || value.operationId !== operation.id) {
    throw new Error('La API no devolvió un acuse válido.')
  }
  return { operationId: operation.id, accepted: true }
}

async function performSync(): Promise<SyncRunSummary> {
  if (!import.meta.env.DEV) throw new Error('La prueba de sincronización solo está disponible en desarrollo.')
  if (getConnectivitySnapshot().status !== 'connected') {
    throw new Error('La API debe estar disponible para sincronizar.')
  }
  await recoverInterruptedOperations()
  const all = await listQueueOperations()
  const eligible = all.filter(operation =>
    operation.kind === DEMO_SYNC_KIND &&
    (operation.status === 'pending' || operation.status === 'failed'),
  )
  const summary: SyncRunSummary = { attempted: 0, synced: 0, failed: 0, remaining: 0 }

  for (const operation of eligible) {
    if (getConnectivitySnapshot().status !== 'connected') break
    try {
      const updated = await processQueueOperation(operation.id, sendDemoNote, 'server')
      summary.attempted += 1
      if (updated.status === 'synced') summary.synced += 1
      else summary.failed += 1
    } catch {
      // Puede haber reclamado la operación otra pestaña. No borrar ni confirmar.
    }
  }

  const final = await listQueueOperations()
  summary.remaining = final.filter(operation =>
    operation.kind === DEMO_SYNC_KIND && operation.status !== 'synced',
  ).length
  return summary
}

/** Bloquea ejecuciones superpuestas dentro de una misma pestaña. */
export function syncDemoPendingOperations(): Promise<SyncRunSummary> {
  if (inFlight) return inFlight
  inFlight = performSync().finally(() => { inFlight = null })
  return inFlight
}

/** Prueba de idempotencia: mismo UUID y payload deben devolver duplicate=true. */
export async function verifyServerDeduplication(operation: PendingOperation): Promise<boolean> {
  if (!import.meta.env.DEV || operation.status !== 'synced' || operation.syncSource !== 'server') {
    throw new Error('Solo pueden verificarse operaciones confirmadas por la API de prueba.')
  }
  const response = await fetch('/api/v1/offline/demo-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      operationId: operation.id,
      kind: operation.kind,
      payload: demoPayload(operation),
    }),
  })
  if (!response.ok) throw new Error(`Error de verificación HTTP ${response.status}.`)
  const body: unknown = await response.json()
  return Boolean(body && typeof body === 'object' &&
    'operationId' in body && body.operationId === operation.id &&
    'accepted' in body && body.accepted === true &&
    'duplicate' in body && body.duplicate === true)
}
