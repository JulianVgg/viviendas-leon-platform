import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { MapPinned, Pencil, Plus, RefreshCcw, Search } from 'lucide-react'
import PageMeta from '@/components/common/PageMeta'
import PageHeader from '@/components/common/PageHeader'
import Card, { CardBody } from '@/components/ui/Card'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import LoadingState from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath, canWriteMunicipalities } from '@/features/auth/screenPermissions'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { listAllMunicipalities, setMunicipalityActive } from '../services/municipalitiesService'
import type { AdminMunicipality } from '../types/municipality'
import MunicipalityFormDialog from '../components/MunicipalityFormDialog'

export default function MunicipalitiesPage() {
  const { usuario } = useAuth()
  const isOnline = useOnlineStatus()
  const canRead = Boolean(usuario && canViewPath(usuario, '/administracion/municipios'))
  const canWrite = Boolean(usuario && canWriteMunicipalities(usuario))
  const [municipalities, setMunicipalities] = useState<AdminMunicipality[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'todos' | 'activos' | 'inactivos'>('todos')
  const [editing, setEditing] = useState<AdminMunicipality | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const records = await listAllMunicipalities(signal)
    if (!signal?.aborted) setMunicipalities(records)
  }, [])

  useEffect(() => {
    if (!canRead) { setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    refresh(controller.signal).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No fue posible consultar los municipios.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [canRead, refresh])

  const filtered = useMemo(() => {
    const needle = search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
    return municipalities.filter((municipality) => {
      if (filter === 'activos' && !municipality.activo) return false
      if (filter === 'inactivos' && municipality.activo) return false
      return !needle || municipality.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(needle)
    })
  }, [municipalities, filter, search])

  async function toggleState(municipality: AdminMunicipality) {
    const activo = !municipality.activo
    if (!window.confirm(`¿Confirmas ${activo ? 'reactivar' : 'desactivar'} el municipio ${municipality.nombre}?`)) return
    setBusyId(municipality.id)
    setError('')
    setSuccess('')
    try {
      const updated = await setMunicipalityActive(municipality.id, activo)
      setMunicipalities((current) => current.map((entry) => entry.id === updated.id ? updated : entry))
      setSuccess(`Municipio ${activo ? 'reactivado' : 'desactivado'} correctamente.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cambiar el estado.')
    } finally { setBusyId(null) }
  }

  function saved(municipality: AdminMunicipality) {
    setMunicipalities((previous) => [...previous.filter((entry) => entry.id !== municipality.id), municipality]
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
    setDialogOpen(false)
    setSuccess(editing ? 'Municipio actualizado correctamente.' : 'Municipio registrado correctamente.')
    setError('')
  }

  if (!canRead) return <Alert variant="error" title="Acceso restringido">No tienes permiso para administrar municipios.</Alert>

  return <>
    <PageMeta title="Municipios | Viviendas León Guatemala" description="Administración del catálogo de municipios." />
    <PageHeader title="Municipios" description="Gestiona los municipios donde la organización desarrolla sus programas y comunidades." actions={<>
      <Button variant="secondary" disabled={loading} onClick={() => {
        setLoading(true); setError(''); setSuccess('')
        void refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Error al actualizar.')).finally(() => setLoading(false))
      }}><RefreshCcw size={16} /> Actualizar</Button>
      {canWrite && <Button disabled={!isOnline} onClick={() => { setEditing(null); setDialogOpen(true); setError(''); setSuccess('') }}><Plus size={18} /> Nuevo municipio</Button>}
    </>} />
    {!isOnline && <div className="mb-4"><Alert variant="warning" title="Sin conexión">Se requiere conexión para administrar municipios.</Alert></div>}
    {error && <div className="mb-4"><Alert variant="error" title="No se pudo completar la operación">{error}</Alert></div>}
    {success && <div className="mb-4"><Alert variant="success" title="Operación realizada">{success}</Alert></div>}
    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card><CardBody><p className="text-sm text-gray-500">Municipios registrados</p><p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{municipalities.length}</p></CardBody></Card>
      <Card><CardBody><p className="text-sm text-gray-500">Municipios activos</p><p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{municipalities.filter((m) => m.activo).length}</p></CardBody></Card>
    </div>
    <Card><CardBody>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
          <label className="relative flex-1"><span className="sr-only">Buscar municipio</span><Search className="absolute left-3 top-3 text-gray-400" size={18} /><input className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm dark:border-gray-700 dark:bg-gray-900" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar municipio" /></label>
          <label><span className="sr-only">Filtrar por estado</span><select className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}><option value="todos">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option></select></label>
        </div>
        <Link to="/administracion/comunidades" className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200">Ver comunidades</Link>
      </div>
      {loading ? <LoadingState label="Cargando municipios..." /> : !filtered.length ? <p className="py-10 text-center text-sm text-gray-500">{municipalities.length ? 'No hay municipios que coincidan con la búsqueda.' : 'Todavía no existen municipios registrados.'}</p> :
        <DataTable caption="Catálogo de municipios" columns={['Municipio', 'Comunidades', 'Activas', 'Estado', 'Acciones']} rows={filtered.map((m) => [
          <span className="flex items-center gap-2 font-medium" key="nombre"><MapPinned size={17} aria-hidden="true" />{m.nombre}</span>,
          String(m.comunidadesCount),
          String(m.comunidadesActivasCount),
          <Badge key="estado" variant={m.activo ? 'success' : 'neutral'}>{m.activo ? 'Activo' : 'Inactivo'}</Badge>,
          canWrite ? <div key="acciones" className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={!isOnline || busyId !== null} onClick={() => { setEditing(m); setDialogOpen(true); setError(''); setSuccess('') }}><Pencil size={14} /> Editar</Button>
            <Button size="sm" variant="ghost" disabled={!isOnline || busyId !== null || (m.activo && m.comunidadesActivasCount > 0)}
              title={m.activo && m.comunidadesActivasCount > 0 ? 'Desactiva antes las comunidades activas.' : undefined}
              onClick={() => void toggleState(m)}>{busyId === m.id ? 'Guardando...' : m.activo ? 'Desactivar' : 'Reactivar'}</Button>
          </div> : <span key="acciones">Solo lectura</span>,
        ])} />}
      <p className="mt-4 text-xs text-gray-500">Solo puedes desactivar un municipio si no contiene comunidades activas. No se eliminan las relaciones históricas.</p>
    </CardBody></Card>
    {canWrite && <MunicipalityFormDialog open={dialogOpen} municipality={editing} onClose={() => setDialogOpen(false)} onSaved={saved} />}
  </>
}
