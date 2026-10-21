import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import ComponentCard from '@/components/common/ComponentCard'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingState from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { canWriteGardens } from '@/features/auth/screenPermissions'
import { gardenImageUrl, listGardens, type Garden } from '../services/gardens'

export default function FamilyGardensSection({ familyId }: { familyId: number }) {
  const [gardens, setGardens] = useState<Garden[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const { usuario } = useAuth()
  const canCreate = Boolean(usuario && canWriteGardens(usuario))

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    listGardens(familyId, controller.signal).then((data) => {
      if (!controller.signal.aborted) { setGardens(data); setError('') }
    }).catch((cause) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No fue posible consultar los huertos.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [familyId, retry])

  return <ComponentCard title="Huertos de la familia" description="Historial de huertos agrícolas asociados con este expediente." actions={canCreate ? <Link to={`/gestion-agricola/huertos/nuevo?familiaId=${familyId}`} className="layout-focus inline-flex min-h-10 items-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">+ Registrar huerto</Link> : undefined}>
    {loading && <LoadingState label="Consultando huertos..." />}
    {error && <Alert variant="error" title="No se pudo cargar" className="mb-4">{error}<Button variant="secondary" type="button" onClick={() => setRetry((n) => n + 1)} className="mt-3">Reintentar</Button></Alert>}
    {!loading && !error && gardens.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Esta familia todavía no tiene huertos registrados.</p>}
    {!loading && !error && gardens.length > 0 && <div className="grid gap-4 md:grid-cols-2">{gardens.map((garden) => <article key={garden.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {gardenImageUrl(garden) && <img src={gardenImageUrl(garden)!} alt={`Vista satelital de ${garden.nombre || `huerto ${garden.id}`}`} loading="lazy" className="h-40 w-full object-cover" />}
      <div className="space-y-2 p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold text-slate-900 dark:text-white">{garden.nombre || `Huerto #${garden.id}`}</h3><Badge>{garden.estado}</Badge></div>
        <p className="text-sm text-slate-600 dark:text-slate-300">{garden.tipo || 'Tipo no especificado'} · {garden.fechaInicio || 'Sin fecha de inicio'}</p>
        {garden.observaciones && <p className="whitespace-pre-wrap text-sm text-slate-500 dark:text-slate-400">{garden.observaciones}</p>}
      </div>
    </article>)}</div>}
  </ComponentCard>
}
