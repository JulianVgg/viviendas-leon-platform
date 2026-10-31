import { useEffect, useState } from 'react'
import PageMeta from '@/components/common/PageMeta'
import FamiliasProgramasPanel from './FamiliasProgramasPanel'
import { consultarFamiliasProgramas, type ResumenFamiliasProgramas } from '../services/dashboardSummaryService'

export default function IndicadoresFamiliasPage() {
  const [datos, setDatos] = useState<ResumenFamiliasProgramas | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    void consultarFamiliasProgramas(controller.signal).then(setDatos).catch(() => {
      if (!controller.signal.aborted) setError('No fue posible consultar los indicadores.')
    })
    return () => controller.abort()
  }, [])
  return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
    <PageMeta title="Indicadores de familias | Viviendas León" description="Participación por programa" />
    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Indicadores</h1>
    {datos ? <FamiliasProgramasPanel datos={datos}/> : error ? <p role="alert" className="text-sm text-rose-600">{error}</p> :
      <div role="status" className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">Cargando indicadores…</div>}
  </main>
}
