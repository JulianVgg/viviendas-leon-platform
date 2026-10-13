import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useConnectivityStatus } from '@/hooks/useConnectivityStatus'
import { SYNC_FINISHED_EVENT } from '@/app/layout/ConnectivitySyncBridge'
import { listQueueOperations, type PendingOperation } from '@/services/pendingOperations'
import {
  DEMO_SYNC_KIND,
  syncDemoPendingOperations,
  verifyServerDeduplication,
  type SyncRunSummary,
} from '@/services/offlineSync'

const statusLabels = {
  pending: 'Pendiente',
  syncing: 'En proceso',
  failed: 'Fallida',
  synced: 'Sincronizada',
} as const

const statusVariants = {
  pending: 'warning',
  syncing: 'neutral',
  failed: 'error',
  synced: 'success',
} as const

function noteTitle(operation: PendingOperation) {
  const data = operation.payload
  if (data && typeof data === 'object' && 'title' in data && typeof data.title === 'string') return data.title
  return '(Sin título)'
}

export default function OfflineSyncTestPage() {
  const connection = useConnectivityStatus()
  const [records, setRecords] = useState<PendingOperation[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [last, setLast] = useState<SyncRunSummary | null>(null)

  const refresh = useCallback(async () => {
    const all = await listQueueOperations()
    setRecords(all.filter(item => item.kind === DEMO_SYNC_KIND))
  }, [])

  useEffect(() => {
    void refresh().catch(() => setError('No se pudo consultar IndexedDB.'))
    function handleFinished(event: Event) {
      const details = (event as CustomEvent<SyncRunSummary | null>).detail
      if (details) setLast(details)
      void refresh().catch(() => setError('Error actualizando los registros locales.'))
    }
    window.addEventListener(SYNC_FINISHED_EVENT, handleFinished)
    return () => window.removeEventListener(SYNC_FINISHED_EVENT, handleFinished)
  }, [refresh])

  async function syncNow() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await syncDemoPendingOperations()
      setLast(result)
      await refresh()
      setMessage(`Intentadas: ${result.attempted}. Confirmadas: ${result.synced}. Fallidas: ${result.failed}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar la sincronización.')
    } finally {
      setBusy(false)
    }
  }

  async function testDuplicate(record: PendingOperation) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const duplicate = await verifyServerDeduplication(record)
      setMessage(duplicate
        ? `El servidor reconoció el UUID ${record.id} como duplicado sin insertar otra fila.`
        : 'El servidor no confirmó la deduplicación. Verifica la base de datos.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La verificación falló.')
    } finally {
      setBusy(false)
    }
  }

  const outstanding = records.filter(item => item.status !== 'synced').length
  const realSynced = records.filter(item => item.status === 'synced' && item.syncSource === 'server').length
  const simulated = records.filter(item => item.status === 'synced' && item.syncSource === 'simulation').length

  return <>
    <PageMeta title="OFF-06 | Viviendas León" description="Validación de sincronización con PostgreSQL." />
    <PageHeader title="Prueba de sincronización OFF-06" description="Envío real a la API de anotaciones sintéticas pendientes." />
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={connection.status === 'connected' ? 'success' : 'warning'}>
          {connection.status === 'connected' ? 'API disponible' : 'Sin API disponible'}
        </Badge>
        <Badge variant="warning">Pendientes: {outstanding}</Badge>
        <Badge variant="success">Confirmadas por servidor: {realSynced}</Badge>
        <Button type="button" disabled={busy || connection.status !== 'connected'} onClick={() => void syncNow()}>
          {busy ? 'Procesando...' : 'Sincronizar pendientes'}
        </Button>
        <Button type="button" variant="secondary" disabled={busy}
          onClick={() => void refresh().catch(() => setError('No se pudo actualizar.'))}>
          Actualizar lista
        </Button>
      </div>
      <p className="text-sm text-amber-700 dark:text-amber-300">
        Solo desarrollo: se insertan notas FICTICIAS en una tabla independiente de PostgreSQL.
        No se crean visitas ni familias reales, y las confirmaciones simuladas de OFF-04 no se envían.
      </p>
      {last && <p className="text-sm">Última ejecución: {last.attempted} intentos, {last.synced} confirmadas, {last.failed} fallidas, {last.remaining} pendientes.</p>}
      {simulated > 0 && <p className="text-sm text-slate-500">{simulated} confirmación(es) previas de simulación: no equivalen a sincronización real.</p>}
      {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {records.length === 0 ? <p className="text-sm text-slate-500">No hay anotaciones de prueba. Crea una en /offline-operations-test.</p> :
        <ul className="space-y-3">{records.map(record =>
          <li key={record.id} className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{noteTitle(record)}</strong>
              <Badge variant={statusVariants[record.status]}>
                {record.status === 'synced' && record.syncSource === 'simulation' ? 'Simulada (OFF-04)' : statusLabels[record.status]}
              </Badge>
            </div>
            <p className="break-all text-xs text-slate-500">UUID: {record.id} · Intentos: {record.attempts ?? 0}</p>
            {record.lastError && <p className="text-xs text-red-600">Último error: {record.lastError}</p>}
            {record.status === 'synced' && record.syncSource === 'server' &&
              <Button type="button" variant="secondary" size="sm" disabled={busy || connection.status !== 'connected'}
                onClick={() => void testDuplicate(record)}>Verificar no duplicación en API</Button>}
          </li>,
        )}</ul>}
    </section>
  </>
}
