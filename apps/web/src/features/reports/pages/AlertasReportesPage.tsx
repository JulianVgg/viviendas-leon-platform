import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import PageMeta from '@/components/common/PageMeta'
import PageHeader from '@/components/common/PageHeader'
import AlertasSeguimientosPanel from '@/features/dashboard/pages/AlertasSeguimientosPanel'
import { consultarResumenAlertas, type ResumenAlertas } from '@/features/dashboard/services/dashboardSummaryService'

export default function AlertasReportesPage() {
  const [datos, setDatos] = useState<ResumenAlertas | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [reintento, setReintento] = useState(0)
  const actualizar = useCallback(() => setReintento((v) => v + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    setCargando(true)
    setError('')
    void consultarResumenAlertas(controller.signal)
      .then((respuesta) => { if (!controller.signal.aborted) setDatos(respuesta) })
      .catch(() => { if (!controller.signal.aborted) setError('No se pudieron cargar las alertas.') })
      .finally(() => { if (!controller.signal.aborted) setCargando(false) })
    return () => controller.abort()
  }, [reintento])

  return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
    <PageMeta title="Alertas | ViviendasLeón" description="Seguimientos pendientes y visitas vencidas"/>
    <PageHeader title="Alertas" description="Seguimientos y pendientes" actions={<button type="button" onClick={actualizar} disabled={cargando} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium dark:border-gray-700 dark:bg-gray-900"><RefreshCw size={16}/> Actualizar</button>}/>
    {cargando && !datos && <div role="status" className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">Consultando alertas…</div>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button type="button" onClick={actualizar} className="ml-2 underline">Reintentar</button></p>}
    {datos && !error && <AlertasSeguimientosPanel datos={datos} filtros={{}}/>}
  </main>
}
