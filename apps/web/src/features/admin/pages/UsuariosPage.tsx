import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Plus, RefreshCcw, UserRound } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'

type Rol = { id: number; nombre: string; activo?: boolean }
type UsuarioApi = {
  id: number
  nombre: string
  apellido?: string | null
  correo: string
  telefono?: string | null
  estado: string
  roles: Array<string | { id?: number; nombre?: string; rolId?: number; rol?: { id: number; nombre: string } }>
}
type Formulario = { nombre: string; apellido: string; correo: string; telefono: string; rolId: number }

const nuevoFormulario: Formulario = { nombre: '', apellido: '', correo: '', telefono: '', rolId: 0 }
const tarjeta = 'rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900'
const campo = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900'
const boton = 'rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50'

function lista<T>(respuesta: unknown, alternativa: string): T[] {
  if (!respuesta || typeof respuesta !== 'object') return []
  const r = respuesta as Record<string, unknown>
  if (Array.isArray(r.data)) return r.data as T[]
  if (Array.isArray(r[alternativa])) return r[alternativa] as T[]
  if (r.data && typeof r.data === 'object') {
    const d = r.data as Record<string, unknown>
    if (Array.isArray(d[alternativa])) return d[alternativa] as T[]
  }
  return []
}

function nombreRoles(usuario: UsuarioApi): string {
  return usuario.roles?.map((r) => typeof r === 'string' ? r : (r.nombre ?? r.rol?.nombre ?? '')).filter(Boolean).join(', ') || 'Sin rol'
}

function rolDeUsuario(usuario: UsuarioApi, roles: Rol[]): number {
  const primero = usuario.roles?.[0]
  if (!primero) return 0
  if (typeof primero === 'string') return roles.find((r) => r.nombre === primero)?.id ?? 0
  return primero.id ?? primero.rolId ?? primero.rol?.id ?? roles.find((r) => r.nombre === primero.nombre)?.id ?? 0
}

async function solicitar(url: string, opciones?: RequestInit): Promise<unknown> {
  const respuesta = await fetch(url, { credentials: 'same-origin', ...opciones })
  const json: unknown = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    const data = json as { error?: { message?: string } } | null
    throw new Error(data?.error?.message ?? `Error HTTP ${respuesta.status}`)
  }
  return json
}

export default function UsuariosPage() {
  const { usuario: actual } = useAuth()
  const [usuarios, setUsuarios] = useState<UsuarioApi[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [modal, setModal] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [formulario, setFormulario] = useState<Formulario>(nuevoFormulario)
  const [passwordTemporal, setPasswordTemporal] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const cargar = useCallback(async () => {
    const [resultadoUsuarios, resultadoRoles] = await Promise.all([
      solicitar('/api/v1/usuarios'),
      solicitar('/api/v1/usuarios/roles'),
    ])
    setUsuarios(lista<UsuarioApi>(resultadoUsuarios, 'usuarios'))
    setRoles(lista<Rol>(resultadoRoles, 'roles'))
  }, [])

  useEffect(() => {
    let activo = true
    Promise.all([solicitar('/api/v1/usuarios'), solicitar('/api/v1/usuarios/roles')])
      .then(([u, r]) => {
        if (activo) { setUsuarios(lista<UsuarioApi>(u, 'usuarios')); setRoles(lista<Rol>(r, 'roles')) }
      })
      .catch((e: unknown) => { if (activo) setError(e instanceof Error ? e.message : 'No se pudieron consultar los usuarios.') })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [])

  function abrirNuevo() {
    setEditandoId(null)
    setFormulario({ ...nuevoFormulario, rolId: roles.find((r) => r.activo !== false)?.id ?? 0 })
    setModal(true)
    setError('')
    setMensaje('')
    setPasswordTemporal('')
  }

  function abrirEdicion(usuario: UsuarioApi) {
    setEditandoId(usuario.id)
    setFormulario({
      nombre: usuario.nombre,
      apellido: usuario.apellido ?? '',
      correo: usuario.correo,
      telefono: usuario.telefono ?? '',
      rolId: rolDeUsuario(usuario, roles),
    })
    setModal(true)
    setPasswordTemporal('')
    setError('')
    setMensaje('')
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!formulario.rolId || guardando) return
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      const esEdicion = editandoId !== null
      const respuesta = await solicitar(esEdicion ? `/api/v1/usuarios/${editandoId}` : '/api/v1/usuarios', {
        method: esEdicion ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formulario),
      })
      const datos = respuesta as { passwordTemporal?: string; data?: { passwordTemporal?: string } }
      await cargar()
      if (esEdicion) {
        setModal(false)
        setMensaje('Usuario actualizado correctamente.')
      } else {
        setModal(false)
        setMensaje('Usuario creado correctamente.')
        setPasswordTemporal(datos?.passwordTemporal ?? datos?.data?.passwordTemporal ?? '')
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron guardar los datos.') }
    finally { setGuardando(false) }
  }

  async function alternarEstado(usuario: UsuarioApi) {
    if (usuario.id === actual?.id) return
    const nuevoEstado = usuario.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO'
    if (!window.confirm(`¿Confirmas cambiar a ${nuevoEstado} la cuenta de ${usuario.nombre}?`)) return
    setError(''); setMensaje(''); setGuardando(true)
    try {
      await solicitar(`/api/v1/usuarios/${usuario.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      await cargar()
      setMensaje('Estado del usuario actualizado.')
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar el estado.') }
    finally { setGuardando(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Usuarios</h1><p className="mt-1 text-sm text-gray-500">Crear, editar, activar y desactivar cuentas. Solo Directora.</p></div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void cargar().catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error de conexión.'))} className="rounded-lg border border-gray-300 p-2.5 dark:border-gray-700" aria-label="Actualizar listado"><RefreshCcw size={18} /></button>
          <button type="button" onClick={abrirNuevo} className={`${boton} inline-flex items-center gap-2`}><Plus size={18} /> Nuevo usuario</button>
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {mensaje && <p role="status" className="rounded-lg bg-green-50 p-4 text-sm text-green-700">{mensaje}</p>}
      {passwordTemporal && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <h2 className="font-semibold">Contraseña temporal — se muestra una sola vez</h2>
          <p className="mt-1">Entrégala personalmente y por un canal seguro. No la incluyas en capturas ni mensajes grupales.</p>
          <p className="mt-2 break-all rounded bg-white p-3 font-mono">{passwordTemporal}</p>
          <button type="button" className="mt-3 rounded border border-amber-500 px-3 py-2" onClick={() => setPasswordTemporal('')}>Ocultar contraseña</button>
        </section>
      )}

      <section className={tarjeta}>
        {cargando ? <p>Cargando usuarios...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[770px] text-left text-sm">
              <thead className="border-b border-gray-200 text-gray-500 dark:border-gray-700"><tr>
                <th className="px-3 py-3 font-semibold">Nombre</th><th className="px-3 py-3 font-semibold">Correo</th><th className="px-3 py-3 font-semibold">Teléfono</th><th className="px-3 py-3 font-semibold">Rol</th><th className="px-3 py-3 font-semibold">Estado</th><th className="px-3 py-3 font-semibold">Acciones</th>
              </tr></thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-4 font-medium"><span className="inline-flex items-center gap-2"><UserRound size={17} /> {usuario.nombre} {usuario.apellido ?? ''}</span></td>
                    <td className="px-3 py-4">{usuario.correo}</td>
                    <td className="px-3 py-4">{usuario.telefono || '—'}</td>
                    <td className="px-3 py-4">{nombreRoles(usuario)}</td>
                    <td className="px-3 py-4"><span className={usuario.estado === 'ACTIVO' ? 'text-green-700' : 'text-gray-500'}>{usuario.estado}</span></td>
                    <td className="px-3 py-4"><div className="flex gap-2">
                      <button className="rounded border border-gray-300 px-3 py-1.5 dark:border-gray-700" onClick={() => abrirEdicion(usuario)} disabled={usuario.id === actual?.id}>Editar</button>
                      <button className="rounded border border-gray-300 px-3 py-1.5 dark:border-gray-700" disabled={guardando || usuario.id === actual?.id} onClick={() => void alternarEstado(usuario)}>{usuario.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}</button>
                    </div></td>
                  </tr>
                ))}
                {!usuarios.length && <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">No se encontraron usuarios.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="usuario-dialog-title" className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 id="usuario-dialog-title" className="text-xl font-semibold">{editandoId ? 'Editar usuario' : 'Nuevo usuario'}</h2>
            <form onSubmit={(e) => void guardar(e)} className="mt-5 space-y-3">
              <label htmlFor="usuario-nombre" className="block text-sm font-medium">Nombre</label>
              <input id="usuario-nombre" className={campo} maxLength={100} required value={formulario.nombre} onChange={(e) => setFormulario((v) => ({ ...v, nombre: e.target.value }))} />
              <label htmlFor="usuario-apellido" className="block text-sm font-medium">Apellido</label>
              <input id="usuario-apellido" className={campo} maxLength={100} value={formulario.apellido} onChange={(e) => setFormulario((v) => ({ ...v, apellido: e.target.value }))} />
              <label htmlFor="usuario-correo" className="block text-sm font-medium">Correo electrónico</label>
              <input id="usuario-correo" className={campo} type="email" required value={formulario.correo} onChange={(e) => setFormulario((v) => ({ ...v, correo: e.target.value }))} />
              <label htmlFor="usuario-telefono" className="block text-sm font-medium">Teléfono</label>
              <input id="usuario-telefono" className={campo} type="tel" value={formulario.telefono} onChange={(e) => setFormulario((v) => ({ ...v, telefono: e.target.value }))} />
              <label htmlFor="usuario-rol" className="block text-sm font-medium">Rol</label>
              <select id="usuario-rol" className={campo} required value={formulario.rolId || ''} onChange={(e) => setFormulario((v) => ({ ...v, rolId: Number(e.target.value) }))}>
                <option value="">Selecciona un rol</option>
                {roles.filter((r) => r.activo !== false).map((rol) => <option key={rol.id} value={rol.id}>{rol.nombre}</option>)}
              </select>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" className="rounded-lg border border-gray-300 px-4 py-2" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className={boton} disabled={guardando}>{guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Crear usuario'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
