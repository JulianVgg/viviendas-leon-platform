import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import {
  listQueueOperations,
  processQueueOperation,
  recoverInterruptedOperations,
  type PendingOperation,
} from '@/services/pendingOperations'

const DEMO_KIND = 'demo.field-note.create'

type DemoPayload = { title: string; observation: string }

function getDemoPayload(operation: PendingOperation): DemoPayload | null {
  if (operation.kind !== DEMO_KIND) return null
  const value = operation.payload
  if (typeof value !== 'object' || value === null) return null
  if (!('title' in value) || typeof value.title !== 'string') return null
  if (!('observation' in value) || typeof value.observation !== 'string') return null
  return { title: value.title, observation: value.observation }
}

const statusLabel = {
  pending: 'Pendiente',
  syncing: 'Procesando',
  failed: 'Fallida',
  synced: 'Confirmada',
} as const

const statusVariant = {
  pending: 'warning',
  syncing: 'neutral',
  failed: 'error',
  synced: 'success',
} as const

export default function OfflineQueueTestPage() {
  const isOnline = useOnlineStatus()
  const [operations, setOperations] = useState<PendingOperation[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const records = await listQueueOperations()
    setOperations(records.filter((item) => getDemoPayload(item) !== null))
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        await recoverInterruptedOperations()
        if (active) await refresh()
      } catch {
        if (active) setError('No se pudo consultar la cola local.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [refresh])

  async function simulate(id: string, fail: boolean) {
    setBusyId(id)
    setError('')
    setNotice('')
    try {
      const result = await processQueueOperation(
        id,
        async (operation) => {
          if (fail) throw new Error('Fallo simulado para probar reintentos.')
          return { operationId: operation.id, accepted: true as const }
        },
        'simulation',
      )
      await refresh()
      setNotice(result.status === 'synced'
        ? 'Confirmación SIMULADA. No se envió nada al servidor.'
        : 'Fallo simulado: la operación continúa en la cola.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo procesar.')
    } finally {
      setBusyId(null)
    }
  }

  const outstanding = operations.filter((item) => item.status !== 'synced')
  const completed = operations.filter((item) => item.status === 'synced')

  return (
    <>
      <PageMeta title="Prueba OFF-04 | Viviendas León" description="Gestión técnica de la cola offline." />
      <PageHeader
        title="Prueba de cola offline"
        description="Estados, intentos y confirmaciones simuladas de operaciones ficticias."
      />
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isOnline ? 'success' : 'neutral'}>{isOnline ? 'Con conexión' : 'Sin conexión'}</Badge>
          <Badge variant="warning">Pendientes: {outstanding.length}</Badge>
          <Badge variant="success">Confirmadas: {completed.length}</Badge>
          <Button variant="secondary" type="button" disabled={loading || busyId !== null}
            onClick={() => void refresh().catch(() => setError('No se pudo actualizar la cola.'))}>
            Actualizar cola
          </Button>
        </div>
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Entorno de demostración: los botones simulan respuestas de un servidor.
          No se envían datos a la API ni se realiza sincronización real.
        </p>
        {notice && <p className="text-sm text-emerald-700" role="status">{notice}</p>}
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        {loading ? <p>Cargando cola...</p> : operations.length === 0 ? (
          <p className="text-sm text-slate-500">
            No hay operaciones de demostración. Crea una en /offline-operations-test.
          </p>
        ) : (
          <ul className="space-y-3">
            {operations.map((operation) => {
              const payload = getDemoPayload(operation)
              if (!payload) return null
              const canAttempt = operation.status === 'pending' || operation.status === 'failed'
              const busy = busyId !== null
              return (
                <li key={operation.id} className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{payload.title}</strong>
                    <Badge variant={statusVariant[operation.status]}>
                      {operation.status === 'synced' && operation.syncSource === 'simulation'
                        ? 'Confirmada (simulación)' : statusLabel[operation.status]}
                    </Badge>
                  </div>
                  <p className="text-sm">{payload.observation}</p>
                  <p className="text-xs text-slate-500">ID: {operation.id}</p>
                  <p className="text-xs text-slate-500">
                    Intentos: {operation.attempts ?? 0}
                    {operation.lastAttemptAt && ` · Último intento: ${new Date(operation.lastAttemptAt).toLocaleString('es-GT')}`}
                  </p>
                  {operation.lastError && <p className="text-xs text-red-600">Error: {operation.lastError}</p>}
                  {canAttempt && (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" size="sm" disabled={busy}
                        onClick={() => void simulate(operation.id, true)}>
                        Simular fallo
                      </Button>
                      <Button type="button" size="sm" disabled={busy || !isOnline}
                        onClick={() => void simulate(operation.id, false)}>
                        Simular confirmación
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
