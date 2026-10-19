import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapPin, Pencil, Plus, RefreshCcw, Search } from 'lucide-react'
import PageMeta from '@/components/common/PageMeta'
import PageHeader from '@/components/common/PageHeader'
import Card, { CardBody } from '@/components/ui/Card'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import LoadingState from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath, canWriteCommunities } from '@/features/auth/screenPermissions'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { listCommunities, listMunicipalities, setCommunityActive } from '../services/communitiesService'
import type { AdminCommunity, MunicipalityOption } from '../types/community'
import CommunityFormDialog from '../components/CommunityFormDialog'

export default function CommunitiesPage() {
  const { usuario } = useAuth()
  const isOnline = useOnlineStatus()
  const canRead = Boolean(usuario && canViewPath(usuario, '/administracion/comunidades'))
  const canWrite = Boolean(usuario && canWriteCommunities(usuario))
  const [communities, setCommunities] = useState<AdminCommunity[]>([])
  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'todas' | 'activas' | 'inactivas'>('todas')
  const [editing, setEditing] = useState<AdminCommunity | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const [records, municipios] = await Promise.all([listCommunities(signal), listMunicipalities(signal)])
    if (signal?.aborted) return
    setCommunities(records)
    setMunicipalities(municipios)
  }, [])

  useEffect(() => {
    if (!canRead) { setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    refresh(controller.signal).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No fue posible consultar las comunidades.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [canRead, refresh])

  const filtered = useMemo(() => {
    const needle = search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
    return communities.filter((c) => {
      if (filter === 'activas' && !c.activo) return false
      if (filter === 'inactivas' && c.activo) return false
      if (!needle) return true
      const combined = `${c.nombre} ${c.municipio.nombre}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      return combined.includes(needle)
    })
  }, [communities, filter, search])

  async function toggleState(community: AdminCommunity) {
    const nuevoEstado = !community.activo
    const confirmation = nuevoEstado ? 'reactivar' : 'desactivar'
    if (!window.confirm(`¿Confirmas ${confirmation} la comunidad ${community.nombre}?`)) return
    setBusyId(community.id)
    setError('')
    setSuccess('')
    try {
      const result = await setCommunityActive(community.id, nuevoEstado)
      setCommunities((current) => current.map((c) => c.id === result.id ? result : c))
      setSuccess(`Comunidad ${nuevoEstado ? 'reactivada' : 'desactivada'} correctamente.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible cambiar el estado.') }
    finally { setBusyId(null) }
  }

  function saved(result: AdminCommunity) {
    setCommunities((previous) => {
      const current = previous.filter((row) => row.id !== result.id)
      return [...current, result].sort((a, b) => a.municipio.nombre.localeCompare(b.municipio.nombre, 'es') || a.nombre.localeCompare(b.nombre, 'es'))
    })
    setDialogOpen(false)
    setSuccess(editing ? 'Comunidad actualizada correctamente.' : 'Comunidad registrada correctamente.')
    setError('')
  }

  if (!canRead) return <Alert variant="error" title="Acceso restringido">No tienes permiso para administrar comunidades.</Alert>
  return <>
    <PageMeta title="Comunidades | Viviendas León Guatemala" description="Administración del catálogo de comunidades." />
    <PageHeader title="Comunidades" description="Administra las comunidades donde ViviendasLeón atiende a las familias." actions={<>
      <Button variant="secondary" disabled={loading} onClick={() => {
        setLoading(true); setError(''); setSuccess('')
        void refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Error al actualizar.')).finally(() => setLoading(false))
      }}><RefreshCcw size={16} /> Actualizar</Button>
      {canWrite && <Button disabled={!isOnline || !municipalities.length} onClick={() => { setEditing(null); setDialogOpen(true); setError(''); setSuccess('') }}><Plus size={18} /> Nueva comunidad</Button>}
    </>} />
    {!isOnline && <div className="mb-4"><Alert variant="warning" title="Sin conexión">Se requiere conexión para administrar comunidades.</Alert></div>}
    {error && <div className="mb-4"><Alert variant="error" title="No se pudo completar la operación">{error}</Alert></div>}
    {success && <div className="mb-4"><Alert variant="success" title="Operación realizada">{success}</Alert></div>}
    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card><CardBody><p className="text-sm text-gray-500">Comunidades registradas</p><p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{communities.length}</p></CardBody></Card>
      <Card><CardBody><p className="text-sm text-gray-500">Comunidades activas</p><p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{communities.filter((c) => c.activo).length}</p></CardBody></Card>
    </div>
    <Card><CardBody>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1"><span className="sr-only">Buscar comunidad</span><Search className="absolute left-3 top-3 text-gray-400" size={18} /><input className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm dark:border-gray-700 dark:bg-gray-900" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por comunidad o municipio" /></label>
        <label className="flex items-center gap-2 text-sm"><span className="sr-only">Filtrar por estado</span><select className="h-11 rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-900" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}><option value="todas">Todas</option><option value="activas">Activas</option><option value="inactivas">Inactivas</option></select></label>
      </div>
      {loading ? <LoadingState label="Cargando comunidades..." /> : !filtered.length ? <div className="py-10 text-center text-sm text-gray-500">{communities.length ? 'No hay comunidades que coincidan con la búsqueda.' : 'Todavía no existen comunidades registradas.'}</div> :
        <DataTable caption="Catálogo de comunidades" columns={['Comunidad', 'Municipio', 'Familias', 'Estado', 'Acciones']} rows={filtered.map((c) => [
          <span className="flex items-center gap-2 font-medium" key="nombre"><MapPin size={17} aria-hidden="true" />{c.nombre}</span>,
          c.municipio.nombre,
          String(c.familiasCount),
          <Badge key="estado" variant={c.activo ? 'success' : 'neutral'}>{c.activo ? 'Activa' : 'Inactiva'}</Badge>,
          canWrite ? <div key="acciones" className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={!isOnline || busyId !== null} onClick={() => { setEditing(c); setDialogOpen(true); setError(''); setSuccess('') }}><Pencil size={14} /> Editar</Button>
            <Button size="sm" variant="ghost" disabled={!isOnline || busyId !== null} onClick={() => void toggleState(c)}>{busyId === c.id ? 'Guardando...' : c.activo ? 'Desactivar' : 'Reactivar'}</Button>
          </div> : <span key="acciones">Solo lectura</span>,
        ])} />}
    </CardBody></Card>
    {canWrite && <CommunityFormDialog open={dialogOpen} community={editing} municipalities={municipalities} onClose={() => setDialogOpen(false)} onSaved={saved} />}
  </>
}
