import { useEffect, useState, type FormEvent } from 'react'
import { ShieldCheck, RefreshCw } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath } from '@/features/auth/screenPermissions'

type Usuario = { id: number; nombre: string; apellido: string | null }
type Entrada = {
  id: number
  usuarioId: number
  usuario: Usuario
  fecha: string
  entidad: string
  registroId: string | null
  accion: string
  datosNuevos: string | null
}
type Pagina = { page: number; limit: number; total: number; pages: number }
type Filtros = { usuarioId: string; entidad: string; accion: string; desde: string; hasta: string }
const filtrosVacios: Filtros = { usuarioId: '', entidad: '', accion: '', desde: '', hasta: '' }
const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
const entidades = [
  ['autenticacion', 'Autenticación'], ['usuario', 'Usuarios'], ['rol_permiso', 'Roles y permisos'],
  ['perfil', 'Perfil'], ['familia', 'Familias'], ['comunidad', 'Comunidades'],
  ['municipio', 'Municipios'], ['programa', 'Programas'], ['huerto', 'Huertos'],
  ['cultivo', 'Cultivos'], ['insumo', 'Insumos'], ['sanidad', 'Sanidad'],
  ['ciclo_cultivo', 'Ciclos agrícolas'], ['produccion', 'Producción'], ['visita', 'Visitas'],
  ['capacitacion', 'Capacitaciones'], ['calendario', 'Calendario'], ['invitacion', 'Invitaciones'],
  ['reporte', 'Reportes'],
] as const
const acciones = [
  ['CREATE', 'Creación'], ['UPDATE', 'Actualización'], ['DELETE', 'Eliminación'],
  ['LOGIN', 'Inicio de sesión'], ['LOGOUT', 'Cierre de sesión'],
  ['PASSWORD_CHANGE', 'Cambio de contraseña'],
] as const

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin' })
  const json = await response.json().catch(() => null)
  if (!response.ok) throw new Error(json?.error?.message ?? `No se pudo consultar la auditoría (${response.status}).`)
  return json as T
}
function resultado(entrada: Entrada): { etiqueta: string; correcto: boolean; http: string } {
  try {
    const data = JSON.parse(entrada.datosNuevos ?? '') as { resultado?: string; estadoHttp?: number }
    if (data.resultado === 'RECHAZADO') return { etiqueta: 'Rechazado', correcto: false, http: String(data.estadoHttp ?? '') }
    if (data.resultado === 'EXITOSO') return { etiqueta: 'Exitoso', correcto: true, http: String(data.estadoHttp ?? '') }
  } catch { /* Entradas anteriores a la instalación del parche */ }
  return { etiqueta: 'Histórico', correcto: true, http: '' }
}

export default function AuditLogPage() {
  const { usuario } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [form, setForm] = useState<Filtros>(filtrosVacios)
  const [filters, setFilters] = useState<Filtros>(filtrosVacios)
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [rows, setRows] = useState<Entrada[]>([])
  const [pagination, setPagination] = useState<Pagina>({ page: 1, limit: 20, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const autorizado = Boolean(usuario && canViewPath(usuario, '/auditoria/bitacora'))

  useEffect(() => {
    if (!autorizado) return
    let active = true
    void getJson<{ data: Usuario[] }>('/api/v1/auditoria/usuarios')
      .then((r) => { if (active) setUsuarios(r.data) })
      .catch(() => { /* La consulta principal mostrará el error de acceso, si lo hay */ })
    return () => { active = false }
  }, [autorizado])

  useEffect(() => {
    if (!autorizado) { setLoading(false); return }
    let active = true
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value)
    setLoading(true)
    setError('')
    void getJson<{ data: Entrada[]; pagination: Pagina }>(`/api/v1/auditoria/bitacora?${params.toString()}`)
      .then((r) => { if (active) { setRows(r.data); setPagination(r.pagination) } })
      .catch((e: unknown) => { if (active) { setRows([]); setError(e instanceof Error ? e.message : 'Error al consultar la bitácora.') } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [autorizado, filters, page, reload])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setFilters({ ...form })
  }
  function clear() { setForm({ ...filtrosVacios }); setFilters({ ...filtrosVacios }); setPage(1) }
  if (!autorizado) return <div role="alert" className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">No tienes permiso para consultar la bitácora.</div>

  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-white"><ShieldCheck size={24} /> Bitácora de auditoría</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Consulta las operaciones relevantes de los usuarios, con fecha y resultado de cada solicitud.</p>
      </div>
      <button type="button" onClick={() => setReload((v) => v + 1)} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"><RefreshCw size={16} /> Actualizar</button>
    </header>

    <form onSubmit={submit} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-1 text-sm">Usuario
          <select className={inputClass} value={form.usuarioId} onChange={(e) => setForm({ ...form, usuarioId: e.target.value })}>
            <option value="">Todos</option>{usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre} {u.apellido ?? ''} (#{u.id})</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">Módulo
          <select className={inputClass} value={form.entidad} onChange={(e) => setForm({ ...form, entidad: e.target.value })}>
            <option value="">Todos</option>{entidades.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">Operación
          <select className={inputClass} value={form.accion} onChange={(e) => setForm({ ...form, accion: e.target.value })}>
            <option value="">Todas</option>{acciones.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">Desde
          <input className={inputClass} type="date" value={form.desde} max={form.hasta || undefined} onChange={(e) => setForm({ ...form, desde: e.target.value })} />
        </label>
        <label className="space-y-1 text-sm">Hasta
          <input className={inputClass} type="date" value={form.hasta} min={form.desde || undefined} onChange={(e) => setForm({ ...form, hasta: e.target.value })} />
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Aplicar filtros</button>
        <button type="button" onClick={clear} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">Limpiar</button>
      </div>
    </form>

    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" aria-label="Eventos de auditoría">
      <div className="border-b border-gray-200 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">{pagination.total.toLocaleString('es-GT')} operaciones registradas</div>
      {error && <p role="alert" className="p-4 text-sm text-red-600">{error}</p>}
      {loading ? <p role="status" className="p-6 text-sm">Consultando registros...</p> : rows.length === 0 && !error ? <p className="p-6 text-sm text-gray-500">No se encontraron operaciones con estos filtros.</p> : (
        <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300"><tr>
            <th scope="col" className="px-4 py-3">Fecha y hora</th><th scope="col" className="px-4 py-3">Usuario</th><th scope="col" className="px-4 py-3">Módulo</th><th scope="col" className="px-4 py-3">Acción</th><th scope="col" className="px-4 py-3">Registro</th><th scope="col" className="px-4 py-3">Resultado</th>
          </tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-800">{rows.map((r) => {
            const status = resultado(r)
            return <tr key={r.id}>
              <td className="whitespace-nowrap px-4 py-3">{new Date(r.fecha).toLocaleString('es-GT')}</td>
              <td className="px-4 py-3">{r.usuario?.nombre} {r.usuario?.apellido ?? ''}<span className="block text-xs text-gray-500">ID {r.usuarioId}</span></td>
              <td className="px-4 py-3">{entidades.find(([id]) => id === r.entidad)?.[1] ?? r.entidad}</td>
              <td className="px-4 py-3">{acciones.find(([id]) => id === r.accion)?.[1] ?? r.accion}</td>
              <td className="px-4 py-3">{r.registroId ?? '—'}</td>
              <td className="px-4 py-3"><span className={status.correcto ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}>{status.etiqueta}</span>{status.http && <span className="block text-xs text-gray-500">HTTP {status.http}</span>}</td>
            </tr>
          })}</tbody>
        </table></div>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-sm dark:border-gray-800">
        <span>Página {pagination.page} de {Math.max(1, pagination.pages)}</span>
        <div className="flex gap-2">
          <button type="button" disabled={loading || page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700">Anterior</button>
          <button type="button" disabled={loading || page >= pagination.pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700">Siguiente</button>
        </div>
      </div>
    </section>
  </div>
}
