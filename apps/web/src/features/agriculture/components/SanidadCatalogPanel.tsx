import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Pencil, Plus, Search, RefreshCw } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Dialog from '@/components/ui/Dialog'
import Alert from '@/components/ui/Alert'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import { crearSanidad, editarSanidad, listarSanidad, type RegistroSanidad, type TipoSanidad } from '../services/sanidadService'

type Props = { tipo: TipoSanidad; puedeEditar: boolean; online: boolean }
const input = formControlClassName
const normalize = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function SanidadCatalogPanel({ tipo, puedeEditar, online }: Props) {
  const [registros, setRegistros] = useState<RegistroSanidad[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [editing, setEditing] = useState<RegistroSanidad | null>(null)
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [activo, setActivo] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    void listarSanidad(controller.signal).then(data => {
      if (!controller.signal.aborted) setRegistros(data[tipo])
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Error al consultar el catálogo.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [tipo, refresh])

  const filtered = useMemo(() => registros.filter(item => {
    if (filtro === 'activos' && !item.activo || filtro === 'inactivos' && item.activo) return false
    return normalize(`${item.nombre} ${item.descripcion ?? ''}`).includes(normalize(search))
  }), [registros, filtro, search])

  const start = (row?: RegistroSanidad) => {
    setEditing(row ?? null)
    setNombre(row?.nombre ?? '')
    setDescripcion(row?.descripcion ?? '')
    setActivo(row?.activo ?? true)
    setError('')
    setSuccess('')
    setOpen(true)
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving || !puedeEditar || !online) return
    setSaving(true)
    setError('')
    try {
      const body = { nombre: nombre.trim(), descripcion: descripcion.trim() || null, activo }
      if (editing) await editarSanidad(tipo, editing.id, body)
      else await crearSanidad(tipo, body)
      setOpen(false)
      setSuccess('Catálogo actualizado correctamente.')
      setRefresh(n => n + 1)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar.') }
    finally { setSaving(false) }
  }

  return <div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-gray-500 dark:text-gray-400">{registros.filter(x => x.activo).length} disponibles · {registros.length} registrados</div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => setRefresh(n => n + 1)} disabled={loading}><RefreshCw size={15}/> Actualizar</Button>
        {puedeEditar && <Button size="sm" onClick={() => start()} disabled={!online}><Plus size={15}/> Nueva {tipo === 'plagas' ? 'plaga' : 'enfermedad'}</Button>}
      </div>
    </div>
    <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_160px]">
      <label className="relative"><span className="sr-only">Buscar</span><Search size={16} className="absolute left-3 top-3 text-gray-400"/><input className={`${input} w-full pl-9`} placeholder="Buscar por nombre" value={search} onChange={event => setSearch(event.target.value)}/></label>
      <label><span className="sr-only">Estado</span><select className={`${input} w-full`} value={filtro} onChange={event => setFiltro(event.target.value)}><option value="todos">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option></select></label>
    </div>
    {success && <div className="mb-3"><Alert variant="success">{success}</Alert></div>}
    {error && !open && <div className="mb-3"><Alert variant="error">{error}</Alert></div>}
    {loading ? <p className="py-8 text-center text-sm text-gray-500">Consultando catálogo…</p> : !filtered.length ? <p className="py-8 text-center text-sm text-gray-500">No hay registros para los filtros.</p> :
      <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead><tr className="border-b border-gray-200 text-gray-500 dark:border-gray-800"><th className="px-3 py-3">Nombre</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3 text-right">Acción</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800"><td className="px-3 py-3"><p className="font-medium text-gray-800 dark:text-white">{row.nombre}</p>{row.descripcion && <p className="mt-1 text-xs text-gray-500">{row.descripcion}</p>}</td><td className="px-3 py-3"><Badge variant={row.activo ? 'success' : 'neutral'}>{row.activo ? 'Activo' : 'Inactivo'}</Badge></td><td className="px-3 py-3 text-right">{puedeEditar && <Button size="sm" variant="secondary" disabled={!online} onClick={() => start(row)}><Pencil size={14}/> Editar</Button>}</td></tr>)}</tbody></table></div>}
    {puedeEditar && <Dialog title={editing ? `Editar ${tipo === 'plagas' ? 'plaga' : 'enfermedad'}` : `Nueva ${tipo === 'plagas' ? 'plaga' : 'enfermedad'}`} open={open} onClose={() => { if (!saving) setOpen(false) }}>
      <form className="space-y-4" onSubmit={event => void save(event)}>
        {error && <Alert variant="error">{error}</Alert>}
        <FormField id="sanidad-name" label="Nombre" required><input id="sanidad-name" autoFocus required maxLength={120} className={`${input} w-full`} value={nombre} onChange={event => setNombre(event.target.value)}/></FormField>
        <FormField id="sanidad-description" label="Descripción"><textarea id="sanidad-description" maxLength={2000} rows={3} className={`${input} w-full`} value={descripcion} onChange={event => setDescripcion(event.target.value)}/></FormField>
        <FormField id="sanidad-status" label="Estado"><select id="sanidad-status" className={`${input} w-full`} value={activo ? 'activo' : 'inactivo'} onChange={event => setActivo(event.target.value === 'activo')}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></FormField>
        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={saving || !online} type="submit">{saving ? 'Guardando…' : 'Guardar'}</Button></div>
      </form>
    </Dialog>}
  </div>
}
