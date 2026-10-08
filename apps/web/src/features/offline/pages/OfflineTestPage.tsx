import { useState } from 'react'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { getEssentialData, type EssentialDataResult } from '@/services/offlineService'

type TestItem = { id: string; title: string; description: string }

const DEMO_KEY = 'demo:off02:essential-info'
const DEMO_ITEMS: TestItem[] = [
  {
    id: 'off02-001',
    title: 'Registro de prueba OFF-02',
    description: 'Ejemplo técnico sin información personal ni datos reales de beneficiarios.',
  },
]

export default function OfflineTestPage() {
  const isOnline = useOnlineStatus()
  const [result, setResult] = useState<EssentialDataResult<TestItem[]> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function consult() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await getEssentialData<TestItem[]>(DEMO_KEY, async () => {
        // Fuente simulada: sustituir por fetch() real cuando FAM-01 esté listo.
        return DEMO_ITEMS
      })
      setResult(response)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ocurrió un error al consultar los datos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageMeta title="Prueba OFF-02 | Viviendas León" description="Validación de la consulta offline con IndexedDB." />
      <PageHeader title="Prueba de consulta offline" description="Validación temporal de OFF-02 sin modificar el módulo de familias." />
      <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={isOnline ? 'success' : 'neutral'}>{isOnline ? 'Con conexión' : 'Sin conexión'}</Badge>
          <Button type="button" onClick={() => void consult()} disabled={loading}>
            {loading ? 'Consultando...' : 'Consultar información'}
          </Button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Datos de prueba. Con conexión, se guarda una copia local; sin conexión, se lee de IndexedDB.
          Esta pantalla no consulta todavía la API de familias.
        </p>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {result && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Origen: {result.source === 'cache' ? 'copia local (IndexedDB)' : 'datos de prueba cargados con conexión'}
            </p>
            {result.savedAt && <p className="text-xs text-slate-500">Copia guardada: {new Date(result.savedAt).toLocaleString('es-GT')}</p>}
            {result.data.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
