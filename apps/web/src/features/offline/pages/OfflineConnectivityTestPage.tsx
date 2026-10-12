import { useEffect, useState } from 'react'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { SYNC_READY_EVENT } from '@/app/layout/ConnectivitySyncBridge'
import { checkConnectivityNow } from '@/services/connectivity'
import { useConnectivityStatus } from '@/hooks/useConnectivityStatus'

const label = {
  connected: 'Con conexión y API disponible',
  offline: 'Sin conexión del navegador',
  'server-unavailable': 'API no disponible',
  checking: 'Comprobando API...',
} as const

const variant = {
  connected: 'success',
  offline: 'neutral',
  'server-unavailable': 'warning',
  checking: 'neutral',
} as const

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleString('es-GT') : 'Aún no registrado'
}

export default function OfflineConnectivityTestPage() {
  const connectivity = useConnectivityStatus()
  const [recoveryCount, setRecoveryCount] = useState(0)
  const [pendingCount, setPendingCount] = useState<number | null>(null)

  useEffect(() => {
    function onReady(event: Event) {
      const custom = event as CustomEvent<{ pendingCount: number | null }>
      setPendingCount(custom.detail.pendingCount)
      setRecoveryCount((value) => value + 1)
    }

    window.addEventListener(SYNC_READY_EVENT, onReady)
    return () => window.removeEventListener(SYNC_READY_EVENT, onReady)
  }, [])

  return (
    <>
      <PageMeta title="Prueba OFF-05 | Viviendas León" description="Validación de conectividad y recuperación." />
      <PageHeader
        title="Prueba de conectividad OFF-05"
        description="Pérdida, recuperación y preparación de la cola local."
      />
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={variant[connectivity.status]}>{label[connectivity.status]}</Badge>
          <Button type="button" variant="secondary" size="sm" onClick={() => void checkConnectivityNow()}>
            Comprobar ahora
          </Button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Se comprueba <code>/api/health</code> cada 15 segundos y cuando el navegador
          pierde o recupera la conexión, o vuelve a estar activo.
        </p>
        <dl className="space-y-2 text-sm">
          <div><dt className="font-semibold">Última comprobación</dt><dd>{dateLabel(connectivity.lastCheckedAt)}</dd></div>
          <div><dt className="font-semibold">Última recuperación confirmada</dt><dd>{dateLabel(connectivity.recoveredAt)}</dd></div>
          <div><dt className="font-semibold">Eventos de cola lista recibidos en esta pantalla</dt><dd>{recoveryCount}</dd></div>
          <div><dt className="font-semibold">Operaciones sin confirmar al último evento</dt><dd>{pendingCount ?? 'No comprobado / no disponible'}</dd></div>
        </dl>
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Un evento de recuperación solo avisa de que la cola puede revisarse.
          No se envían operaciones ni se simulan respuestas del servidor.
        </p>
      </section>
    </>
  )
}
