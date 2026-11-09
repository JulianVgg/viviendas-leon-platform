import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Boxes, Bug, HeartPulse, Leaf, Pencil, Plus, RefreshCcw, Search, Sprout } from 'lucide-react'
import PageMeta from '@/components/common/PageMeta'
import SanidadCatalogPanel from '../components/SanidadCatalogPanel'
import PageHeader from '@/components/common/PageHeader'
import Card, { CardBody } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Alert from '@/components/ui/Alert'
import LoadingState from '@/components/ui/LoadingState'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath, canWriteInsumos } from '@/features/auth/screenPermissions'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import {
  createCategoriaInsumo, createInsumo, listCategoriasInsumo, listInsumos,
  updateCategoriaInsumo, updateInsumo, InsumosApiError,
  type CategoriaInsumo, type CategoriaInsumoInput, type Insumo, type InsumoInput,
} from '../services/insumosService'
import { esInsumoFicticio, normalizarCategoria, tipoAbonoCategoria, type TipoAbono } from '../services/abonosCatalog'

type Vista = 'abonos' | 'productos' | 'categorias' | 'plagas' | 'enfermedades'
type Filtro = 'todos' | 'activos' | 'inactivos'
const campo = formControlClassName
const validarNombre = (value: string) => value.trim().replace(/\s+/g, ' ').normalize('NFC')
const textoClave = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function InsumosPage() {
  const { usuario } = useAuth()
  const online = useOnlineStatus()
  const autorizado = Boolean(usuario && canViewPath(usuario, '/gestion-agricola/insumos'))
  const editar = Boolean(usuario && canWriteInsumos(usuario))
  const [productos, setProductos] = useState<Insumo[]>([])
  const [categorias, setCategorias] = useState<CategoriaInsumo[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [vista, setVista] = useState<Vista>('abonos')
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [editandoProducto, setEditandoProducto] = useState<Insumo | null>(null)
  const [editandoCategoria, setEditandoCategoria] = useState<CategoriaInsumo | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [tipoAbono, setTipoAbono] = useState<TipoAbono>('organico')
  const [activo, setActivo] = useState(true)
  const [erroresCampos, setErroresCampos] = useState<Record<string, string>>({})

  const cargar = useCallback(async (signal?: AbortSignal) => {
    const [lista, grupos] = await Promise.all([listInsumos(signal), listCategoriasInsumo(signal)])
    if (!signal?.aborted) { setProductos(lista); setCategorias(grupos) }
  }, [])

  useEffect(() => {
    if (!autorizado) { setCargando(false); return }
    const controller = new AbortController()
    setCargando(true)
    void cargar(controller.signal).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo consultar el catálogo.')
    }).finally(() => { if (!controller.signal.aborted) setCargando(false) })
    return () => controller.abort()
  }, [autorizado, cargar])

  const items = useMemo(() => {
    const needle = textoClave(busqueda.trim())
    const coincideEstado = (estado: boolean) => filtro === 'todos' || (filtro === 'activos' ? estado : !estado)
    if (vista === 'abonos' || vista === 'productos') return productos.filter(item => {
      if (esInsumoFicticio(item) || !coincideEstado(item.activo)) return false
      const esAbono = tipoAbonoCategoria(item.categoriaInsumo.nombre) !== null
      if ((vista === 'abonos') !== esAbono) return false
      if (vista === 'productos' && categoriaFiltro && item.categoriaInsumoId !== Number(categoriaFiltro)) return false
      return textoClave(`${item.nombre} ${item.descripcion ?? ''} ${item.categoriaInsumo.nombre}`).includes(needle)
    })
    return categorias.filter(item => coincideEstado(item.activo) && textoClave(`${item.nombre} ${item.descripcion ?? ''}`).includes(needle))
  }, [vista, productos, categorias, filtro, categoriaFiltro, busqueda])

  function categoriaPorTipo(tipo: TipoAbono): number | undefined {
    const nombre = tipo === 'organico' ? 'abonos organicos' : 'abonos inorganicos'
    return categorias.find(c => normalizarCategoria(c.nombre) === nombre && c.activo)?.id
  }
  function abrirNuevo() {
    setEditandoProducto(null); setEditandoCategoria(null)
    setTipoAbono('organico')
    setNombre(''); setDescripcion('')
    setCategoriaId(vista === 'abonos' ? String(categoriaPorTipo('organico') ?? '') :
      categorias.find(c => c.activo && !tipoAbonoCategoria(c.nombre))?.id.toString() ?? '')
    setActivo(true); setErroresCampos({}); setError(''); setAbierto(true)
  }
  function editarRegistro(item: Insumo | CategoriaInsumo, tipo: Vista) {
    const esProducto = tipo === 'productos' || tipo === 'abonos'
    setEditandoProducto(esProducto ? item as Insumo : null)
    setEditandoCategoria(tipo === 'categorias' ? item as CategoriaInsumo : null)
    setNombre(item.nombre); setDescripcion(item.descripcion ?? '')
    setCategoriaId(esProducto ? String((item as Insumo).categoriaInsumoId) : '')
    if (tipo === 'abonos') setTipoAbono(tipoAbonoCategoria((item as Insumo).categoriaInsumo.nombre) ?? 'organico')
    setActivo(item.activo); setErroresCampos({}); setError(''); setAbierto(true)
  }
  function cerrar() { if (!guardando) setAbierto(false) }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editar || guardando) return
    const nextErrors: Record<string, string> = {}
    const nombreFinal = validarNombre(nombre)
    if (!nombreFinal || nombreFinal.length > 120 || /[\u0000-\u001f\u007f]/.test(nombre)) nextErrors.nombre = 'El nombre debe tener entre 1 y 120 caracteres.'
    if (descripcion.length > 2000 || /[\u0000-\u001f\u007f]/.test(descripcion)) nextErrors.descripcion = 'Descripción inválida o demasiado larga.'
    const idCategoriaFinal = vista === 'abonos' ? categoriaPorTipo(tipoAbono) : Number(categoriaId)
    if ((vista === 'productos' || vista === 'abonos') && (!idCategoriaFinal || !categorias.some(c => c.id === idCategoriaFinal))) nextErrors.categoriaInsumoId = 'Selecciona un tipo o categoría disponible.'
    if (Object.keys(nextErrors).length) { setErroresCampos(nextErrors); return }
    setGuardando(true); setError(''); setErroresCampos({})
    try {
      const base: CategoriaInsumoInput = { nombre: nombreFinal, descripcion: descripcion.trim() || null, activo }
      if (vista === 'productos' || vista === 'abonos') {
        const payload: InsumoInput = { ...base, categoriaInsumoId: idCategoriaFinal! }
        if (editandoProducto) await updateInsumo(editandoProducto.id, payload)
        else await createInsumo(payload)
      } else {
        if (editandoCategoria) await updateCategoriaInsumo(editandoCategoria.id, base)
        else await createCategoriaInsumo(base)
      }
      await cargar()
      setAbierto(false)
      setAviso('Catálogo actualizado correctamente.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el registro.')
      if (cause instanceof InsumosApiError) setErroresCampos(Object.fromEntries(cause.details.map(item => [item.field, item.message])))
    } finally { setGuardando(false) }
  }

  if (!autorizado) return <Alert variant="error" title="Acceso restringido">No tienes permiso para consultar los insumos.</Alert>

  return <>
    <PageMeta title="Insumos | ViviendasLeón" description="Catálogo de productos y tratamientos agrícolas." />
    <PageHeader title="Insumos" description="Catálogo de productos y tratamientos agrícolas." actions={<>
      <Button variant="secondary" disabled={!online || cargando} onClick={() => {
        setCargando(true); setError(''); setAviso('')
        void cargar().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Error al actualizar.')).finally(() => setCargando(false))
      }}><RefreshCcw size={16} /> Actualizar</Button>
    </>} />
    {!online && <div className="mb-4"><Alert variant="warning">La administración del catálogo requiere conexión.</Alert></div>}
    {error && !abierto && <div className="mb-4"><Alert variant="error" title="No se pudo completar la operación">{error}</Alert></div>}
    {aviso && <div className="mb-4"><Alert variant="success">{aviso}</Alert></div>}

    <Card><CardBody>
      <div className="mb-5 flex flex-wrap gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
        {(['abonos', 'productos', 'categorias', 'plagas', 'enfermedades'] as const).map(tab => <button key={tab} type="button" onClick={() => { setVista(tab); setFiltro('todos'); setBusqueda(''); setCategoriaFiltro('') }}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${vista === tab ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
          {tab === 'abonos' ? <span className="inline-flex items-center gap-2"><Sprout size={16} /> Abonos</span> : tab === 'productos' ? <span className="inline-flex items-center gap-2"><Leaf size={16} /> Productos</span> : tab === 'categorias' ? <span className="inline-flex items-center gap-2"><Boxes size={16} /> Categorías</span> : tab === 'plagas' ? <span className="inline-flex items-center gap-2"><Bug size={16} /> Plagas</span> : <span className="inline-flex items-center gap-2"><HeartPulse size={16} /> Enfermedades</span>}
        </button>)}
      </div>
      {(vista === 'plagas' || vista === 'enfermedades') ?
        <SanidadCatalogPanel tipo={vista} puedeEditar={editar} online={online}/> : <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {items.filter(item => item.activo).length} disponibles · {items.length} registrados
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => {
            setCargando(true); setError(''); void cargar().catch(cause => setError(cause instanceof Error ? cause.message : 'Error al actualizar.')).finally(() => setCargando(false))
          }} disabled={!online || cargando}><RefreshCcw size={15}/> Actualizar</Button>
          {editar && <Button size="sm" onClick={abrirNuevo} disabled={!online}>
            <Plus size={15}/> {vista === 'abonos' ? 'Nuevo abono' : vista === 'productos' ? 'Nuevo producto' : 'Nueva categoría'}
          </Button>}
        </div>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_160px]">
        <label className="relative"><span className="sr-only">Buscar</span><Search size={16} className="absolute left-3 top-3 text-gray-400"/>
          <input className={`${campo} w-full pl-9`} value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre" /></label>
        <label><span className="sr-only">Estado</span><select className={`${campo} w-full`} value={filtro} onChange={e => setFiltro(e.target.value as Filtro)}><option value="todos">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option></select></label>
        {vista === 'productos' && <label className="sm:col-span-2"><span className="sr-only">Categoría</span><select className={`${campo} w-full`} value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)}><option value="">Todas las categorías</option>{categorias.filter(c => !tipoAbonoCategoria(c.nombre)).map(c => <option value={c.id} key={c.id}>{c.nombre}</option>)}</select></label>}
      </div>
      {cargando ? <LoadingState label="Consultando insumos..." /> : !items.length ? <p className="py-10 text-center text-sm text-gray-500">Sin resultados para los filtros seleccionados.</p> :
        <div className="overflow-x-auto"><table className="min-w-[620px] w-full text-left text-sm">
          <thead><tr className="border-b border-gray-200 text-gray-500 dark:border-gray-800"><th className="px-3 py-3">Nombre</th><th className="px-3 py-3">{vista === 'abonos' ? 'Tipo' : vista === 'productos' ? 'Categoría' : 'Productos vinculados'}</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3 text-right">Acción</th></tr></thead>
          <tbody>{items.map(item => <tr key={item.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
            <td className="px-3 py-3"><p className="font-medium text-gray-800 dark:text-white">{item.nombre}</p>{item.descripcion && <p className="mt-1 max-w-md text-xs text-gray-500">{item.descripcion}</p>}</td>
            <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{vista === 'abonos' ? (tipoAbonoCategoria((item as Insumo).categoriaInsumo.nombre) === 'inorganico' ? 'Inorgánico' : 'Orgánico') : vista === 'productos' ? (item as Insumo).categoriaInsumo.nombre : `${(item as CategoriaInsumo).insumosCount} productos`}</td>
            <td className="px-3 py-3"><Badge variant={item.activo ? 'success' : 'neutral'}>{item.activo ? 'Activo' : 'Inactivo'}</Badge></td>
            <td className="px-3 py-3 text-right">{editar ? <Button variant="secondary" size="sm" disabled={!online} onClick={() => editarRegistro(item, vista)}><Pencil size={14} /> Editar</Button> : <span className="text-xs text-gray-500">Solo lectura</span>}</td>
          </tr>)}</tbody>
        </table></div>}
      </>}
    </CardBody></Card>

    {editar && (vista === 'abonos' || vista === 'productos' || vista === 'categorias') && <Dialog open={abierto} onClose={cerrar} title={vista === 'abonos' ? editandoProducto ? 'Editar abono' : 'Nuevo abono' : vista === 'productos' ? editandoProducto ? 'Editar producto' : 'Nuevo producto' : editandoCategoria ? 'Editar categoría' : 'Nueva categoría'}>
      <form className="space-y-5" onSubmit={e => void enviar(e)}>
        {error && <Alert variant="error">{error}</Alert>}
        <FormField id="insumo-name" label="Nombre" required error={erroresCampos.nombre}><input id="insumo-name" className={campo} value={nombre} onChange={e => setNombre(e.target.value)} maxLength={120} required autoFocus/></FormField>
        {vista === 'abonos' && <FormField id="abono-type" label="Tipo" required error={erroresCampos.categoriaInsumoId}>
          <select id="abono-type" className={campo} value={tipoAbono} onChange={e => setTipoAbono(e.target.value as TipoAbono)} required>
            <option value="organico">Abono orgánico</option><option value="inorganico">Abono inorgánico</option>
          </select>
        </FormField>}
        {vista === 'productos' && <FormField id="insumo-category" label="Categoría" required error={erroresCampos.categoriaInsumoId}>
          <select id="insumo-category" className={campo} value={categoriaId} onChange={e => setCategoriaId(e.target.value)} required><option value="">Seleccionar categoría</option>{categorias.filter(c => !tipoAbonoCategoria(c.nombre) && (c.activo || c.id === Number(categoriaId))).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
        </FormField>}
        <FormField id="insumo-description" label="Descripción" error={erroresCampos.descripcion}><textarea id="insumo-description" className={`${campo} min-h-20`} value={descripcion} onChange={e => setDescripcion(e.target.value)} maxLength={2000} rows={3}/></FormField>
        <FormField id="insumo-status" label="Estado"><select id="insumo-status" className={campo} value={activo ? 'activo' : 'inactivo'} onChange={e => setActivo(e.target.value === 'activo')}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></FormField>
        {(vista === 'productos' || vista === 'abonos') && editandoProducto && (editandoProducto.tratamientosCount + editandoProducto.entregasCount) > 0 &&
          <Alert variant="info">Este producto tiene registros vinculados. Desactivarlo conserva su historial.</Alert>}
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
          <Button type="button" variant="secondary" disabled={guardando} onClick={cerrar}>Cancelar</Button>
          <Button type="submit" disabled={guardando || !online}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
        </div>
      </form>
    </Dialog>}
  </>
}
