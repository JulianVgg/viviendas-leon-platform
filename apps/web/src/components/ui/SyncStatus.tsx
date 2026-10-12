
import Badge from './Badge'

type SyncState =
  | 'connected'
  | 'checking'
  | 'server-unavailable'
  | 'synced'
  | 'syncing'
  | 'pending'
  | 'offline'
  | 'error'

const labels: Record<SyncState, string> = {
  connected: 'Con conexión',
  checking: 'Comprobando conexión',
  'server-unavailable': 'Servidor no disponible',
  synced: 'Sincronizado',
  syncing: 'Sincronizando',
  pending: 'Pendiente de sincronización',
  offline: 'Sin conexión',
  error: 'Error de sincronización',
}

const variants = {
  connected: 'success',
  checking: 'neutral',
  'server-unavailable': 'warning',
  synced: 'success',
  syncing: 'neutral',
  pending: 'warning',
  offline: 'neutral',
  error: 'error',
} as const

export default function SyncStatus({
  state,
  pendingCount = 0,
}: {
  state: SyncState
  pendingCount?: number
}) {
  const label =
    state === 'pending' && pendingCount > 0
      ? `${labels[state]} (${pendingCount})`
      : labels[state]

  return (
    <div
      aria-label={`Estado de conectividad: ${label}`}
      role="status"
      className="inline-flex"
    >
      <Badge variant={variants[state]}>{label}</Badge>
    </div>
  )
}
