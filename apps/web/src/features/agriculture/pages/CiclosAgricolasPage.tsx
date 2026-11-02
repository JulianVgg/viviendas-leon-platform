import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card, { CardBody } from '@/components/ui/Card'
import PageMeta from '@/components/common/PageMeta'
import PageHeader from '@/components/common/PageHeader'
import LoadingState from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath, canWriteProduction } from '@/features/auth/screenPermissions'
import { listCycles, type Cycle } from '../services/cyclesService'

export default function CiclosAgricolasPage() {
  const { usuario } = useAuth()
  const allowed = Boolean(usuario && canViewPath(usuario, '/gestion-agricola/ciclos'))
  const canRegisterProduction = Boolean(usuario && canViewPath(usuario, '/gestion-agricola/produccion') && canWriteProduction(usuario))
  const [data, setData] = useState<Cycle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('TODOS')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    if (!allowed) { setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    listCycles(undefined, controller.signal).then(result => { if (!controller.signal.aborted) { setData(result); setError('') } })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No fue posible consultar las siembras.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [allowed, refresh])
  const visible = useMemo(() => data.filter(item => {
    const matchesState = status === 'TODOS' || item.estado === status
    const key = `${item.cultivo.nombre} ${item.huerto.nombre ?? ''} ${item.huerto.familia.nombreReferencia} ${item.huerto.familia.comunidad.nombre}`.toLocaleLowerCase('es')
    return matchesState && key.includes(search.trim().toLocaleLowerCase('es'))
  }), [data, search, status])
  if (!allowed) return <Alert variant="error" title="Acceso restringido">No tienes permiso para consultar ciclos agrícolas.</Alert>
  return <>
    <PageMeta title="Ciclos agrícolas | ViviendasLeón" description="Consulta general de siembras por familia y huerto." />
    <PageHeader title="Ciclos agrícolas" description="Consulta siembras, huertos y familias; el registro se realiza desde el expediente familiar." />
    {error && <Alert variant="error" title="No se pudo consultar">{error}<Button type="button" variant="secondary" className="mt-3" onClick={() => setRefresh(n => n + 1)}>Reintentar</Button></Alert>}
    <Card><CardBody>
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <label className="flex-1 text-sm">Buscar por cultivo, familia o comunidad
          <input className="mt-1 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        <label className="text-sm">Estado
          <select className="mt-1 block h-11 rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="TODOS">Todos</option><option value="ACTIVO">Activos</option><option value="FINALIZADO">Finalizados</option>
          </select>
        </label>
      </div>
      {loading && <LoadingState label="Consultando siembras..." />}
      {!loading && !error && !visible.length && <p className="py-10 text-center text-sm text-slate-500">No se encontraron siembras.</p>}
      {!loading && !error && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(cycle => <article key={cycle.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2"><h2 className="font-semibold text-slate-900 dark:text-white">{cycle.cultivo.nombre}</h2><Badge>{cycle.estado}</Badge></div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{cycle.huerto.nombre || `Huerto #${cycle.huertoId}`}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{cycle.huerto.familia.nombreReferencia} · {cycle.huerto.familia.comunidad.nombre}</p>
        <p className="mt-2 text-xs text-slate-500">Siembra: {cycle.fechaSiembra ?? 'No registrada'} · Trasplante: {cycle.fechaTrasplante ?? 'No registrado'}</p>
        <p className="mt-1 text-xs text-slate-500">Plantas iniciales: {cycle.cantidadPlantas ?? 'No indicado'}</p>
        <Link to={`/familias/${cycle.huerto.familiaId}?tab=gardens`} className="mt-3 inline-block text-sm font-medium text-brand-600 underline">Abrir expediente</Link>
        <Link to={`/gestion-agricola/ciclos/${cycle.id}`} className="ml-3 inline-block text-sm font-medium text-brand-600 underline">Ver seguimiento</Link>
        {canRegisterProduction && <Link to={`/gestion-agricola/produccion?cicloId=${cycle.id}`} className="ml-3 inline-block text-sm font-medium text-brand-600 underline">Registrar cosecha</Link>}
      </article>)}</div>}
    </CardBody></Card>
  </>
}
