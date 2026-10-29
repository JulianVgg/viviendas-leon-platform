import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { RefreshCw, Search } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import { useAuth } from '@/features/auth/AuthProvider'
import { getTrainings, type Training } from '../services/trainingService'

const card = 'rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900'
const dateLabel = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('es-GT')
const director = (roles: string[]) => roles.some(role => role.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === 'direccion general')

export default function TrainingHistoryPage() {
  const { usuario } = useAuth()
  const canWrite = Boolean(usuario && (director(usuario.roles) || usuario.permisos.includes('CAPACITACIONES_WRITE')))
  const [rows, setRows] = useState<Training[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('TODAS')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(20)
  const [selected, setSelected] = useState<Training | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try { setRows(await getTrainings()); setError('') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo consultar el historial.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])

  const visible = useMemo(() => rows.filter(item => {
    const term = search.trim().toLocaleLowerCase('es')
    if (term && !`${item.tema} ${item.comunidad?.nombre ?? ''} ${item.facilitadorNombre ?? ''} ${item.familiasPresentes.map(f => f.nombreReferencia).join(' ')}`.toLocaleLowerCase('es').includes(term)) return false
    return (filter === 'TODAS' || item.estado === filter) && (!desde || item.fecha >= desde) && (!hasta || item.fecha <= hasta)
  }), [rows, filter, search, desde, hasta])
  useEffect(() => { setPagina(1) }, [search, filter, desde, hasta, porPagina])
  const totalPaginas = Math.max(1, Math.ceil(visible.length / porPagina))
  const paginaActual = Math.min(pagina, totalPaginas)
  const registrosPagina = visible.slice((paginaActual-1)*porPagina, paginaActual*porPagina)
  const completed = rows.filter(item => item.estado === 'REALIZADA').length
  const upcoming = rows.filter(item => item.estado === 'PROGRAMADA').length
  const familiesPresent = rows.reduce((total, item) => total + item.familiasPresentes.length, 0)

  return <div>
    <PageMeta title="Historial de capacitaciones | Viviendas León" description="Consulta de actividades y asistencia" />
    <PageHeader title="Historial de capacitaciones" description=""
      actions={canWrite ? <Link to="/actividades/capacitaciones/registrar" className="inline-flex min-h-11 items-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600">+ Registrar capacitación</Link> : undefined} />
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
    <div className="mb-5 grid gap-4 sm:grid-cols-3">
      {([['Capacitaciones realizadas', completed], ['Programadas', upcoming], ['Asistencias familiares registradas', familiesPresent]] as const).map(([label, count]) =>
        <div key={label} className={`${card} p-5`}><p className="text-sm text-gray-500 dark:text-gray-400">{label}</p><p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{count}</p></div>)}
    </div>
    <section className={card} aria-label="Registro de capacitaciones">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5 dark:border-gray-800"><h2 className="font-semibold text-gray-900 dark:text-white">Registro de capacitaciones</h2><Button size="sm" type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}><RefreshCw size={16} /> Actualizar</Button></header>
      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_200px_180px_180px]">
        <label className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-900"><Search size={17} className="text-gray-400" /><input aria-label="Buscar capacitación o familia" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tema, comunidad o familia" className="h-11 min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none dark:text-white" /></label>
        <select aria-label="Filtrar por estado" value={filter} onChange={e => setFilter(e.target.value)} className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
          <option value="TODAS">Todos los estados</option><option value="REALIZADA">Realizadas</option><option value="PROGRAMADA">Programadas</option>
        </select>
        <label className="text-xs text-gray-500">Desde<input aria-label="Fecha inicial" type="date" value={desde} onChange={e=>setDesde(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"/></label>
        <label className="text-xs text-gray-500">Hasta<input aria-label="Fecha final" type="date" min={desde || undefined} value={hasta} onChange={e=>setHasta(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"/></label>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 dark:bg-gray-800/40"><tr><th className="px-5 py-3">Tema</th><th className="px-5 py-3">Comunidad</th><th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Facilitador</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3">Familias presentes</th><th className="px-5 py-3">Detalle</th></tr></thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{registrosPagina.map(item => <tr key={item.id} className="align-top text-gray-700 dark:text-gray-300">
          <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">{item.tema}</td>
          <td className="px-5 py-4">{item.comunidad?.nombre ?? 'Sin comunidad'}</td>
          <td className="px-5 py-4">{dateLabel(item.fecha)}</td>
          <td className="px-5 py-4">{item.facilitadorNombre || '—'}</td>
          <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.estado === 'REALIZADA' ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300' : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'}`}>{item.estado === 'REALIZADA' ? 'Realizada' : 'Programada'}</span></td>
          <td className="px-5 py-4">{item.familiasPresentes.length || 'Sin registro'}</td>
          <td className="px-5 py-4"><button type="button" onClick={() => setSelected(item)} className="font-semibold text-brand-600 hover:underline dark:text-brand-400">Ver detalle</button></td>
        </tr>)}</tbody></table>
        {loading && <p className="p-8 text-center text-sm text-gray-500">Cargando historial…</p>}
        {!loading && visible.length === 0 && <p className="p-8 text-center text-sm text-gray-500">No se encontraron capacitaciones.</p>}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-5 py-4 text-xs text-gray-500 dark:border-gray-800">
        <span>{visible.length} capacitaciones · Página {paginaActual} de {totalPaginas}</span>
        <div className="flex items-center gap-2">
          <select aria-label="Registros por página" value={porPagina} onChange={e=>setPorPagina(Number(e.target.value))} className="rounded-lg border border-gray-300 bg-white px-2 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
            <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
          </select>
          <Button size="sm" variant="secondary" type="button" disabled={paginaActual<=1} onClick={()=>setPagina(p=>Math.max(1,p-1))}>Anterior</Button>
          <Button size="sm" variant="secondary" type="button" disabled={paginaActual>=totalPaginas} onClick={()=>setPagina(p=>Math.min(totalPaginas,p+1))}>Siguiente</Button>
        </div>
      </footer>
    </section>
    <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.tema ?? 'Capacitación'}
      description={selected ? `${dateLabel(selected.fecha)} · ${selected.estado === 'REALIZADA' ? 'Realizada' : 'Programada'}` : ''}
      actions={<><Button type="button" variant="secondary" onClick={() => setSelected(null)}>Cerrar</Button>
        {canWrite && selected && <Link className="inline-flex min-h-11 items-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600" to={`/actividades/capacitaciones/registrar?capacitacion=${selected.id}`}>Registrar asistencia</Link>}
      </>}>
      {selected && <div className="space-y-4 text-sm">
        <dl className="space-y-2"><div><dt className="font-semibold">Comunidad</dt><dd>{selected.comunidad?.nombre || 'Sin comunidad asignada'}</dd></div><div><dt className="font-semibold">Facilitador</dt><dd>{selected.facilitadorNombre || 'No indicado'}</dd></div><div><dt className="font-semibold">Descripción</dt><dd className="whitespace-pre-wrap">{selected.descripcion || 'Sin descripción'}</dd></div><div><dt className="font-semibold">Observaciones</dt><dd className="whitespace-pre-wrap">{selected.observaciones || 'Sin observaciones'}</dd></div></dl>
        <div className="border-t border-gray-200 pt-4 dark:border-gray-700"><h3 className="mb-2 font-semibold">Familias presentes ({selected.familiasPresentes.length})</h3>
          {selected.familiasPresentes.length ? <ul className="space-y-1">{selected.familiasPresentes.map(f => <li key={f.id} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/5">{f.nombreReferencia} — {f.comunidad.nombre}</li>)}</ul>
            : <p className="text-gray-500">No se ha registrado asistencia familiar para esta capacitación.</p>}
        </div>
        <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
          <h3 className="mb-3 font-semibold">Fotografías de evidencia ({selected.evidencias.length})</h3>
          {selected.evidencias.length > 0 ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {selected.evidencias.map(photo => <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700" title={`Ver ${photo.name}`}>
              <img src={photo.url} alt={`Evidencia: ${photo.name}`} className="h-32 w-full object-cover" loading="lazy" />
              <span className="block truncate p-2 text-xs">{photo.name}</span>
            </a>)}
          </div> : <p className="text-gray-500">No hay fotografías de evidencia.</p>}
        </div>
      </div>}
    </Dialog>
  </div>
}
