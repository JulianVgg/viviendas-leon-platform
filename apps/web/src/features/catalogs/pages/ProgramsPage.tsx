import { useCallback, useEffect, useMemo, useState } from 'react'
import { HeartHandshake, Pencil, Plus, RefreshCcw, Search } from 'lucide-react'
import PageMeta from '@/components/common/PageMeta'
import PageHeader from '@/components/common/PageHeader'
import Card, { CardBody } from '@/components/ui/Card'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import LoadingState from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath, canWritePrograms } from '@/features/auth/screenPermissions'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { listAllPrograms } from '../services/programsService'
import type { AdminProgram } from '../types/program'
import ProgramFormDialog from '../components/ProgramFormDialog'

const displayDate = (date: string | null) => date ?? '—'

export default function ProgramsPage() {
  const { usuario } = useAuth()
  const isOnline = useOnlineStatus()
  const canRead = Boolean(usuario && canViewPath(usuario, '/administracion/programas'))
  const canWrite = Boolean(usuario && canWritePrograms(usuario))
  const [programs, setPrograms] = useState<AdminProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'todos' | 'ACTIVO' | 'INACTIVO'>('todos')
  const [editing, setEditing] = useState<AdminProgram | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const records = await listAllPrograms(signal)
    if (!signal?.aborted) setPrograms(records)
  }, [])

  useEffect(() => {
    if (!canRead) { setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    refresh(controller.signal).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No fue posible consultar los programas.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [canRead, refresh])

  const filtered = useMemo(() => {
    const needle = search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
    return programs.filter((p) => {
      if (filter !== 'todos' && p.estado !== filter) return false
      const haystack = `${p.nombre} ${p.descripcion ?? ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      return !needle || haystack.includes(needle)
    })
  }, [programs, filter, search])

  function saved(program: AdminProgram) {
    setPrograms((current) => [...current.filter((p) => p.id !== program.id), program]
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
    setDialogOpen(false)
    setSuccess(editing ? 'Programa actualizado correctamente.' : 'Programa registrado correctamente.')
    setError('')
  }

  if (!canRead) return <Alert variant="error" title="Acceso restringido">No tienes permiso para administrar programas.</Alert>

  return <>
    <PageMeta title="Programas | Viviendas León Guatemala" description="Administración del catálogo de programas institucionales." />
    <PageHeader title="Programas" description="Registra y actualiza los programas institucionales que pueden asignarse a las familias." actions={<>
      <Button variant="secondary" disabled={loading} onClick={() => {
        setLoading(true); setError(''); setSuccess('')
        void refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Error al actualizar.')).finally(() => setLoading(false))
      }}><RefreshCcw size={16} /> Actualizar</Button>
      {canWrite && <Button disabled={!isOnline} onClick={() => { setEditing(null); setDialogOpen(true); setError(''); setSuccess('') }}>
        <Plus size={18} /> Nuevo programa
      </Button>}
    </>} />
    {!isOnline && <div className="mb-4"><Alert variant="warning" title="Sin conexión">La administración de programas requiere conexión.</Alert></div>}
    {error && <div className="mb-4"><Alert variant="error" title="No se pudo completar la operación">{error}</Alert></div>}
    {success && <div className="mb-4"><Alert variant="success" title="Operación realizada">{success}</Alert></div>}
    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card><CardBody><p className="text-sm text-gray-500">Programas registrados</p><p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{programs.length}</p></CardBody></Card>
      <Card><CardBody><p className="text-sm text-gray-500">Programas activos</p><p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{programs.filter((p) => p.estado === 'ACTIVO').length}</p></CardBody></Card>
    </div>
    <Card><CardBody>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1"><span className="sr-only">Buscar programa</span>
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm dark:border-gray-700 dark:bg-gray-900" value={search}
            onChange={(e) => setSearch(e.target.value)} placeholder="Buscar programa" />
        </label>
        <label><span className="sr-only">Filtrar por estado</span>
          <select className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="todos">Todos</option><option value="ACTIVO">Activos</option><option value="INACTIVO">Inactivos</option>
          </select>
        </label>
      </div>
      {loading ? <LoadingState label="Cargando programas..." /> : !filtered.length ?
        <p className="py-10 text-center text-sm text-gray-500">{programs.length ? 'No hay programas que coincidan con la búsqueda.' : 'Todavía no hay programas registrados.'}</p> :
        <DataTable caption="Catálogo de programas" columns={['Programa', 'Vigencia', 'Familias asociadas', 'Estado', 'Acciones']} rows={filtered.map((p) => [
          <div key="nombre"><span className="flex items-center gap-2 font-medium"><HeartHandshake size={17} aria-hidden="true" />{p.nombre}</span>
            {p.descripcion && <p className="mt-1 max-w-sm text-xs text-gray-500">{p.descripcion}</p>}</div>,
          <span key="fechas">{displayDate(p.fechaInicio)} / {displayDate(p.fechaFin)}</span>,
          String(p.participacionesCount),
          <Badge key="estado" variant={p.estado === 'ACTIVO' ? 'success' : 'neutral'}>{p.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}</Badge>,
          canWrite ? <Button key="acciones" size="sm" variant="secondary" disabled={!isOnline} onClick={() => {
            setEditing(p); setDialogOpen(true); setError(''); setSuccess('')
          }}><Pencil size={14} /> Editar</Button> : <span key="acciones">Solo lectura</span>,
        ])} />}
      <p className="mt-4 text-xs text-gray-500">Desactivar un programa no borra las participaciones históricas.</p>
    </CardBody></Card>
    {canWrite && <ProgramFormDialog open={dialogOpen} program={editing} onClose={() => setDialogOpen(false)} onSaved={saved} />}
  </>
}
