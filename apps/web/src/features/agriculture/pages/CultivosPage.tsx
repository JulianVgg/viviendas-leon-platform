import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Leaf, Pencil, Plus, RefreshCcw, Search } from 'lucide-react'
import PageMeta from '@/components/common/PageMeta'
import PageHeader from '@/components/common/PageHeader'
import Card, { CardBody } from '@/components/ui/Card'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import Alert from '@/components/ui/Alert'
import LoadingState from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath, canWriteCrops } from '@/features/auth/screenPermissions'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { createCrop, listCrops, updateCrop, CropsApiError, type Crop, type CropInput } from '../services/cropsService'

type DialogProps = { open: boolean; crop: Crop | null; onClose: () => void; onSaved: (record: Crop) => void }

function CropFormDialog({ open, crop, onClose, onSaved }: DialogProps) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [activo, setActivo] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setNombre(crop?.nombre ?? '')
    setDescripcion(crop?.descripcion ?? '')
    setActivo(crop?.activo ?? true)
    setError('')
    setFieldErrors({})
  }, [open, crop])

  function close() { if (!saving) onClose() }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const normalized = nombre.normalize('NFC').trim().replace(/\s+/g, ' ')
    const errors: Record<string, string> = {}
    if (!normalized || normalized.length > 120 || /[\u0000-\u001f\u007f]/.test(nombre)) {
      errors.nombre = 'Ingresa un nombre válido de hasta 120 caracteres.'
    }
    if (descripcion.trim().length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(descripcion)) {
      errors.descripcion = 'La descripción no puede superar 2000 caracteres ni contener caracteres de control.'
    }
    if (Object.keys(errors).length) { setFieldErrors(errors); return }
    const input: CropInput = { nombre: normalized, descripcion: descripcion.trim() || null, activo }
    setSaving(true); setError(''); setFieldErrors({})
    try {
      onSaved(crop ? await updateCrop(crop.id, input) : await createCrop(input))
    } catch (cause) {
      if (cause instanceof CropsApiError) {
        setError(cause.message)
        setFieldErrors(Object.fromEntries(cause.details.map(({ field, message }) => [field, message])))
      } else setError('No se pudo confirmar el guardado. Consulta el catálogo antes de reintentar.')
    } finally { setSaving(false) }
  }

  return <Dialog open={open} onClose={close} title={crop ? 'Editar cultivo' : 'Nuevo cultivo'}
    description="Los cultivos activos estarán disponibles para registrar nuevos ciclos agrícolas.">
    <form onSubmit={(e) => void submit(e)} className="space-y-5">
      {error && <Alert variant="error" title="No se pudo guardar">{error}</Alert>}
      <FormField id="crop-name" label="Nombre del cultivo" required error={fieldErrors.nombre}>
        <input id="crop-name" className={formControlClassName} value={nombre} required maxLength={120} autoFocus
          onChange={(e) => { setNombre(e.target.value); setFieldErrors((old) => ({ ...old, nombre: '' })) }} placeholder="Ej. Tomate" />
      </FormField>
      <FormField id="crop-description" label="Descripción" error={fieldErrors.descripcion}>
        <textarea id="crop-description" className={formControlClassName} rows={3} maxLength={2000} value={descripcion}
          onChange={(e) => { setDescripcion(e.target.value); setFieldErrors((old) => ({ ...old, descripcion: '' })) }} placeholder="Descripción opcional del cultivo" />
      </FormField>
      <FormField id="crop-active" label="Estado" required error={fieldErrors.activo}>
        <select id="crop-active" className={formControlClassName} value={activo ? 'activo' : 'inactivo'}
          onChange={(e) => setActivo(e.target.value === 'activo')}>
          <option value="activo">Activo — disponible para nuevos ciclos</option>
          <option value="inactivo">Inactivo — conservar únicamente el historial</option>
        </select>
      </FormField>
      {crop && crop.ciclosCount > 0 && <Alert variant="info" title="Ciclos vinculados">
        Este cultivo aparece en {crop.ciclosCount} ciclo(s). Editarlo o desactivarlo no elimina esos registros.
      </Alert>}
      <div className="flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
        <Button type="button" variant="secondary" disabled={saving} onClick={close}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : crop ? 'Guardar cambios' : 'Registrar cultivo'}</Button>
      </div>
    </form>
  </Dialog>
}

export default function CultivosPage() {
  const { usuario } = useAuth()
  const online = useOnlineStatus()
  const canRead = Boolean(usuario && canViewPath(usuario, '/gestion-agricola/cultivos'))
  const canWrite = Boolean(usuario && canWriteCrops(usuario))
  const [crops, setCrops] = useState<Crop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'todos' | 'activos' | 'inactivos'>('todos')
  const [editing, setEditing] = useState<Crop | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const data = await listCrops(signal)
    if (!signal?.aborted) setCrops(data)
  }, [])
  useEffect(() => {
    if (!canRead) { setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    void refresh(controller.signal).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo consultar el catálogo.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [canRead, refresh])

  const filtered = useMemo(() => {
    const needle = search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
    return crops.filter((crop) => {
      if (filter === 'activos' && !crop.activo) return false
      if (filter === 'inactivos' && crop.activo) return false
      const haystack = `${crop.nombre} ${crop.descripcion ?? ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      return !needle || haystack.includes(needle)
    })
  }, [crops, filter, search])

  function saved(record: Crop) {
    setCrops((old) => [...old.filter((c) => c.id !== record.id), record].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
    setDialogOpen(false)
    setError('')
    setSuccess(editing ? 'Cultivo actualizado correctamente.' : 'Cultivo registrado correctamente.')
  }
  if (!canRead) return <Alert variant="error" title="Acceso restringido">No tienes permiso para consultar cultivos.</Alert>

  return <>
    <PageMeta title="Cultivos | Viviendas León Guatemala" description="Catálogo institucional de cultivos agrícolas." />
    <PageHeader title="Cultivos" description="Consulta, registra y actualiza los cultivos utilizados en los huertos."
      actions={<>
        <Button variant="secondary" disabled={loading || !online} onClick={() => {
          setLoading(true); setError(''); setSuccess('')
          void refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Error al actualizar.')).finally(() => setLoading(false))
        }}><RefreshCcw size={16} /> Actualizar</Button>
        {canWrite && <Button disabled={!online} onClick={() => { setEditing(null); setDialogOpen(true); setError(''); setSuccess('') }}>
          <Plus size={18} /> Nuevo cultivo
        </Button>}
      </>} />
    {!online && <div className="mb-4"><Alert variant="warning" title="Sin conexión">La administración de cultivos requiere conexión.</Alert></div>}
    {error && <div className="mb-4"><Alert variant="error" title="Error al consultar o guardar">{error}</Alert></div>}
    {success && <div className="mb-4"><Alert variant="success" title="Operación realizada">{success}</Alert></div>}
    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card><CardBody><p className="text-sm text-gray-500">Cultivos registrados</p><p className="mt-2 text-2xl font-semibold">{crops.length}</p></CardBody></Card>
      <Card><CardBody><p className="text-sm text-gray-500">Cultivos activos</p><p className="mt-2 text-2xl font-semibold">{crops.filter((crop) => crop.activo).length}</p></CardBody></Card>
    </div>
    <Card><CardBody>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1"><span className="sr-only">Buscar cultivo</span>
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cultivo" />
        </label>
        <label><span className="sr-only">Filtrar por estado</span>
          <select className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="todos">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option>
          </select>
        </label>
      </div>
      {loading ? <LoadingState label="Cargando cultivos..." /> : !filtered.length ?
        <p className="py-10 text-center text-sm text-gray-500">{crops.length ? 'No hay coincidencias con los filtros.' : 'Todavía no hay cultivos registrados.'}</p> :
        <DataTable caption="Catálogo de cultivos" columns={['Cultivo', 'Ciclos asociados', 'Estado', 'Acciones']} rows={filtered.map((crop) => [
          <div key="nombre"><span className="flex items-center gap-2 font-medium"><Leaf size={17} aria-hidden="true" />{crop.nombre}</span>
            {crop.descripcion && <p className="mt-1 max-w-sm text-xs text-gray-500">{crop.descripcion}</p>}</div>,
          String(crop.ciclosCount),
          <Badge key="estado" variant={crop.activo ? 'success' : 'neutral'}>{crop.activo ? 'Activo' : 'Inactivo'}</Badge>,
          canWrite ? <Button key="accion" size="sm" variant="secondary" disabled={!online} onClick={() => {
            setEditing(crop); setDialogOpen(true); setError(''); setSuccess('')
          }}><Pencil size={14} /> Editar</Button> : <span key="accion">Solo lectura</span>,
        ])} />}
      <p className="mt-4 text-xs text-gray-500">Desactivar un cultivo evita seleccionarlo en nuevos ciclos, pero conserva los ciclos históricos.</p>
    </CardBody></Card>
    {canWrite && <CropFormDialog open={dialogOpen} crop={editing} onClose={() => setDialogOpen(false)} onSaved={saved} />}
  </>
}
