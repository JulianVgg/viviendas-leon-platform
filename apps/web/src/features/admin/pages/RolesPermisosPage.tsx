import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { CheckSquare2, Plus, Save, ShieldCheck } from 'lucide-react'

type Permiso = { id: number; codigo: string; nombre: string; descripcion: string | null }
type Rol = { id: number; nombre: string; descripcion: string | null; activo: boolean; permisos: Permiso[] }
type Pantalla = { codigo: string; nombre: string; ruta: string; detalle?: string; fija?: boolean; especial?: boolean }
type Grupo = { titulo: string; pantallas: Pantalla[] }

// Catálogo explícito de las pantallas existentes en apps/web/src/app/routes.tsx.
// Las redirecciones y la página 404 no son pantallas configurables.
// Login y establecer-password son parte de la autenticación y siempre están disponibles cuando corresponda.
const GRUPOS: Grupo[] = [
  { titulo: 'Navegación', pantallas: [
    { codigo: 'PANTALLA_DASHBOARD', nombre: 'Dashboard', ruta: '/', fija: true },
    { codigo: 'PANTALLA_MI_PERFIL', nombre: 'Mi perfil', ruta: '/mi-perfil', fija: true },
  ] },
  { titulo: 'Familias y beneficiarios', pantallas: [
    { codigo: 'PANTALLA_FAMILIAS', nombre: 'Listado de familias', ruta: '/familias' },
    { codigo: 'PANTALLA_FAMILIAS_CREAR', nombre: 'Registrar familia', ruta: '/familias/nueva' },
    { codigo: 'PANTALLA_FAMILIAS_EDITAR', nombre: 'Editar familias', ruta: '/familias/editar' },
    { codigo: 'PANTALLA_FAMILIAS_DETALLE', nombre: 'Detalle de familia', ruta: '/familias/:id' },
    { codigo: 'FAMILIAS_WRITE', nombre: 'Escritura de familias e integrantes', ruta: 'Operaciones API', especial: true },
  ] },
  { titulo: 'Gestión agrícola', pantallas: [
    { codigo: 'PANTALLA_GESTION_AGRICOLA', nombre: 'Vista general de gestión agrícola', ruta: '/gestion-agricola' },
    { codigo: 'PANTALLA_HUERTOS', nombre: 'Huertos', ruta: '/gestion-agricola/huertos' },
    { codigo: 'HUERTOS_WRITE', nombre: 'Registro e imágenes de huertos', ruta: 'Operaciones API', especial: true },
    { codigo: 'PANTALLA_CULTIVOS', nombre: 'Cultivos', ruta: '/gestion-agricola/cultivos' },
    { codigo: 'PANTALLA_PRODUCCION', nombre: 'Producción', ruta: '/gestion-agricola/produccion' },
    { codigo: 'PANTALLA_CONTROL_FITOSANITARIO', nombre: 'Control fitosanitario', ruta: '/gestion-agricola/control-fitosanitario' },
    { codigo: 'PANTALLA_INSUMOS', nombre: 'Insumos', ruta: '/gestion-agricola/insumos' },
  ] },
  { titulo: 'Visitas técnicas', pantallas: [
    { codigo: 'PANTALLA_VISITAS_AGENDA', nombre: 'Agenda de visitas', ruta: '/visitas/agenda' },
    { codigo: 'PANTALLA_VISITAS_NUEVA', nombre: 'Registrar visita', ruta: '/visitas/nueva' },
    { codigo: 'PANTALLA_VISITAS_HISTORIAL', nombre: 'Historial de visitas', ruta: '/visitas/historial' },
  ] },
  { titulo: 'Actividades y voluntariado', pantallas: [
    { codigo: 'PANTALLA_ACTIVIDADES', nombre: 'Vista general de actividades', ruta: '/actividades' },
    { codigo: 'PANTALLA_ASISTENCIA_TECNICA', nombre: 'Asistencia técnica', ruta: '/actividades/asistencia-tecnica' },
    { codigo: 'PANTALLA_CAPACITACIONES', nombre: 'Capacitaciones', ruta: '/actividades/capacitaciones' },
    { codigo: 'PANTALLA_VOLUNTARIADO', nombre: 'Voluntariado', ruta: '/voluntariado' },
  ] },
  { titulo: 'Reportes', pantallas: [
    { codigo: 'PANTALLA_REPORTES', nombre: 'Vista general de reportes', ruta: '/reportes' },
    { codigo: 'PANTALLA_REPORTES_LISTA', nombre: 'Reportes', ruta: '/reportes/reportes' },
    { codigo: 'PANTALLA_INDICADORES', nombre: 'Indicadores', ruta: '/reportes/indicadores' },
    { codigo: 'PANTALLA_ALERTAS', nombre: 'Alertas', ruta: '/reportes/alertas' },
  ] },
  { titulo: 'Administración', pantallas: [
    { codigo: 'PANTALLA_ADMINISTRACION', nombre: 'Vista general de administración', ruta: '/administracion' },
    { codigo: 'PANTALLA_PROGRAMAS', nombre: 'Programas', ruta: '/administracion/programas' },
    { codigo: 'PROGRAMAS_WRITE', nombre: 'Escritura de programas', ruta: 'Operaciones API', especial: true },
    { codigo: 'PANTALLA_USUARIOS', nombre: 'Usuarios', ruta: '/administracion/usuarios', especial: true },
    { codigo: 'PANTALLA_ROLES_PERMISOS', nombre: 'Roles y permisos', ruta: '/administracion/roles-permisos', especial: true },
    { codigo: 'PANTALLA_CONFIGURACION', nombre: 'Configuración', ruta: '/administracion/configuracion' },
  ] },
  { titulo: 'Auditoría', pantallas: [
    { codigo: 'PANTALLA_AUDITORIA', nombre: 'Vista general de auditoría', ruta: '/auditoria' },
    { codigo: 'PANTALLA_BITACORA', nombre: 'Bitácora', ruta: '/auditoria/bitacora' },
  ] },
  { titulo: 'Herramientas de prueba (solo desarrollo)', pantallas: [
    { codigo: 'PANTALLA_OFFLINE_TEST', nombre: 'Prueba offline', ruta: '/offline-test', detalle: 'No está disponible en producción' },
    { codigo: 'PANTALLA_OFFLINE_OPERACIONES', nombre: 'Operaciones offline', ruta: '/offline-operations-test' },
    { codigo: 'PANTALLA_OFFLINE_COLA', nombre: 'Cola offline', ruta: '/offline-queue-test' },
    { codigo: 'PANTALLA_OFFLINE_CONECTIVIDAD', nombre: 'Conectividad offline', ruta: '/offline-connectivity-test' },
    { codigo: 'PANTALLA_OFFLINE_SYNC', nombre: 'Sincronización offline', ruta: '/offline-sync-test' },
  ] },
]

const catalogo = GRUPOS.flatMap((grupo) => grupo.pantallas)
const codigosCatalogo = new Set(catalogo.map((pantalla) => pantalla.codigo))
const tarjeta = 'rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-gray-900'
const campo = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white'
const boton = 'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'

async function solicitar(url: string, opciones?: RequestInit) {
  const respuesta = await fetch(url, { credentials: 'same-origin', ...opciones })
  const json = await respuesta.json().catch(() => null)
  if (!respuesta.ok) throw new Error(json?.error?.message ?? `Error HTTP ${respuesta.status}`)
  return json
}

export default function RolesPermisosPage() {
  const [roles, setRoles] = useState<Rol[]>([])
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [seleccionId, setSeleccionId] = useState<number | null>(null)
  const [codigosSeleccionados, setCodigosSeleccionados] = useState<string[]>([])
  const [rolNombre, setRolNombre] = useState('')
  const [rolDescripcion, setRolDescripcion] = useState('')
  const [editarNombre, setEditarNombre] = useState('')
  const [editarDescripcion, setEditarDescripcion] = useState('')
  const [editarActivo, setEditarActivo] = useState(true)
  const [permisoCodigo, setPermisoCodigo] = useState('')
  const [permisoNombre, setPermisoNombre] = useState('')
  const [permisoDescripcion, setPermisoDescripcion] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const cargar = useCallback(async (rolPreferido?: number) => {
    const [resultadoRoles, resultadoPermisos] = await Promise.all([
      solicitar('/api/v1/roles'),
      solicitar('/api/v1/roles/permisos'),
    ])
    const nuevosRoles: Rol[] = resultadoRoles.data
    const nuevosPermisos: Permiso[] = resultadoPermisos.data
    setRoles(nuevosRoles)
    setPermisos(nuevosPermisos)
    const rolElegido = nuevosRoles.find((rol) => rol.id === rolPreferido) ?? nuevosRoles[0] ?? null
    setSeleccionId(rolElegido?.id ?? null)
    setCodigosSeleccionados(rolElegido?.permisos.map((permiso) => permiso.codigo) ?? [])
    setEditarNombre(rolElegido?.nombre ?? '')
    setEditarDescripcion(rolElegido?.descripcion ?? '')
    setEditarActivo(rolElegido?.activo ?? true)
  }, [])

  useEffect(() => {
    let activo = true
    Promise.all([solicitar('/api/v1/roles'), solicitar('/api/v1/roles/permisos')])
      .then(([resultadoRoles, resultadoPermisos]) => {
        if (!activo) return
        const nuevosRoles: Rol[] = resultadoRoles.data
        setRoles(nuevosRoles)
        setPermisos(resultadoPermisos.data)
        setSeleccionId(nuevosRoles[0]?.id ?? null)
        setCodigosSeleccionados(nuevosRoles[0]?.permisos.map((p) => p.codigo) ?? [])
        setEditarNombre(nuevosRoles[0]?.nombre ?? '')
        setEditarDescripcion(nuevosRoles[0]?.descripcion ?? '')
        setEditarActivo(nuevosRoles[0]?.activo ?? true)
      })
      .catch((e: unknown) => { if (activo) setError(e instanceof Error ? e.message : 'No se pudieron cargar los roles.') })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [])

  const rolSeleccionado = roles.find((rol) => rol.id === seleccionId) ?? null
  const esDireccionGeneral = rolSeleccionado?.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === 'direccion general'
  const permisosAdicionales = permisos.filter((permiso) => !codigosCatalogo.has(permiso.codigo))

  function seleccionarRol(rol: Rol) {
    if (guardando) return
    setSeleccionId(rol.id)
    setCodigosSeleccionados(rol.permisos.map((permiso) => permiso.codigo))
    setEditarNombre(rol.nombre)
    setEditarDescripcion(rol.descripcion ?? '')
    setEditarActivo(rol.activo)
    setError('')
    setMensaje('')
  }

  function marcar(codigo: string, marcado: boolean) {
    setCodigosSeleccionados((actuales) => {
      const nuevos = new Set(actuales)
      if (marcado) nuevos.add(codigo)
      else nuevos.delete(codigo)
      return [...nuevos]
    })
    setMensaje('')
  }

  function marcarGrupo(grupo: Grupo, seleccionar: boolean) {
    setCodigosSeleccionados((actuales) => {
      const nuevos = new Set(actuales)
      for (const pantalla of grupo.pantallas) {
        if (pantalla.fija) continue
        if (seleccionar) nuevos.add(pantalla.codigo)
        else nuevos.delete(pantalla.codigo)
      }
      return [...nuevos]
    })
    setMensaje('')
  }

  async function crearRol(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (guardando) return
    setError(''); setMensaje(''); setGuardando(true)
    try {
      const resultado = await solicitar('/api/v1/roles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: rolNombre, descripcion: rolDescripcion }),
      })
      setRolNombre(''); setRolDescripcion('')
      await cargar(resultado.data.id)
      setMensaje('Rol creado. Ahora puedes asignarle las pantallas permitidas.')
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo crear el rol.') }
    finally { setGuardando(false) }
  }

  async function actualizarRol(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!rolSeleccionado || guardando) return
    setError(''); setMensaje(''); setGuardando(true)
    try {
      await solicitar(`/api/v1/roles/${rolSeleccionado.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editarNombre.trim(),
          descripcion: editarDescripcion.trim(),
          activo: editarActivo,
        }),
      })
      await cargar(rolSeleccionado.id)
      setMensaje('Nombre, descripción y estado del rol actualizados.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar el rol.')
    } finally { setGuardando(false) }
  }

  // Conservamos la posibilidad de registrar permisos adicionales, distintos del catálogo de pantallas.
  async function crearPermiso(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (guardando) return
    setError(''); setMensaje(''); setGuardando(true)
    try {
      await solicitar('/api/v1/roles/permisos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: permisoCodigo, nombre: permisoNombre, descripcion: permisoDescripcion }),
      })
      setPermisoCodigo(''); setPermisoNombre(''); setPermisoDescripcion('')
      await cargar(seleccionId ?? undefined)
      setMensaje('Permiso personalizado creado correctamente.')
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo crear el permiso.') }
    finally { setGuardando(false) }
  }

  async function guardarPermisos() {
    if (!rolSeleccionado || guardando) return
    setError(''); setMensaje(''); setGuardando(true)
    try {
      // Si una pantalla no tiene todavía fila en la tabla permiso,
      // la creamos solo al marcarla y guardar (sin modificar el esquema).
      let disponibles = [...permisos]
      for (const pantalla of catalogo) {
        if (pantalla.fija || !codigosSeleccionados.includes(pantalla.codigo)) continue
        if (disponibles.some((permiso) => permiso.codigo === pantalla.codigo)) continue
        const nuevo = await solicitar('/api/v1/roles/permisos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo: pantalla.codigo,
            nombre: pantalla.nombre,
            descripcion: `Acceso a la pantalla ${pantalla.ruta}`,
          }),
        })
        disponibles = [...disponibles, nuevo.data]
      }

      // Incluye los permisos existentes no relacionados con pantallas.
      // Al desmarcar cualquiera de ellos, se retira de este rol al guardar.
      const ids = codigosSeleccionados
        .filter((codigo) => !catalogo.some((pantalla) => pantalla.codigo === codigo && pantalla.fija))
        .map((codigo) => disponibles.find((permiso) => permiso.codigo === codigo)?.id)
      if (ids.some((id) => id === undefined)) {
        throw new Error('Algunos permisos no existen. Recarga la pantalla y vuelve a intentarlo.')
      }

      await solicitar(`/api/v1/roles/${rolSeleccionado.id}/permisos`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permisoIds: ids }),
      })
      await cargar(rolSeleccionado.id)
      setMensaje(`Permisos de «${rolSeleccionado.nombre}» guardados en PostgreSQL.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar los permisos.')
    } finally { setGuardando(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Roles y permisos</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Selecciona un rol y marca las pantallas a las que tendrá acceso.</p>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {mensaje && <p role="status" className="rounded-lg bg-green-50 p-4 text-sm text-green-700">{mensaje}</p>}

      <section className={tarjeta}>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Plus size={19} /> Crear rol</h2>
        <form onSubmit={(e) => void crearRol(e)} className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_2fr_auto]">
          <div>
            <label htmlFor="rol-nombre" className="mb-2 block text-sm font-medium">Nombre del rol</label>
            <input id="rol-nombre" required maxLength={80} value={rolNombre} onChange={(e) => setRolNombre(e.target.value)} className={campo} placeholder="Ej.: Personal de campo" />
          </div>
          <div>
            <label htmlFor="rol-descripcion" className="mb-2 block text-sm font-medium">Descripción</label>
            <input id="rol-descripcion" maxLength={500} value={rolDescripcion} onChange={(e) => setRolDescripcion(e.target.value)} className={campo} />
          </div>
          <button className={boton} type="submit" disabled={guardando}>Crear rol</button>
        </form>
      </section>

      <section className={tarjeta}>
        <h2 className="mb-4 text-lg font-semibold">Editar un rol existente</h2>
        {rolSeleccionado ? (
          <form onSubmit={(e) => void actualizarRol(e)} className="space-y-4">
            <p className="text-sm text-gray-500">Editando: {rolSeleccionado.nombre}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="editar-rol-nombre" className="mb-2 block text-sm font-medium">Nombre</label>
                <input
                  id="editar-rol-nombre" className={campo} required maxLength={80}
                  value={editarNombre} onChange={(e) => setEditarNombre(e.target.value)}
                  disabled={guardando || esDireccionGeneral}
                />
              </div>
              <div>
                <label htmlFor="editar-rol-descripcion" className="mb-2 block text-sm font-medium">Descripción</label>
                <input
                  id="editar-rol-descripcion" className={campo} maxLength={500}
                  value={editarDescripcion} onChange={(e) => setEditarDescripcion(e.target.value)}
                  disabled={guardando}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editarActivo} disabled={guardando || esDireccionGeneral}
                onChange={(e) => setEditarActivo(e.target.checked)} />
              Rol activo
            </label>
            {esDireccionGeneral && <p className="text-xs text-amber-700">Dirección general es un rol protegido: no se puede renombrar ni desactivar.</p>}
            <button type="submit" className={boton} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar cambios del rol'}</button>
          </form>
        ) : (
          <p className="text-sm text-gray-500">Selecciona primero un rol en la checklist para editarlo.</p>
        )}
      </section>

      <section className={tarjeta}>
        <div className="mb-5 flex items-center gap-2">
          <ShieldCheck size={20} className="text-blue-600" />
          <h2 className="text-lg font-semibold">Checklist de acceso por pantalla</h2>
        </div>
        {cargando ? <p className="text-sm">Cargando roles y permisos...</p> : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
            <div className="space-y-2">
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">Selecciona un rol</p>
              {roles.map((rol) => (
                <button
                  key={rol.id} type="button" disabled={guardando}
                  onClick={() => seleccionarRol(rol)}
                  aria-pressed={seleccionId === rol.id}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm disabled:opacity-60 ${seleccionId === rol.id ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40' : 'border-gray-200 dark:border-gray-700'}`}
                >
                  <span className="block font-semibold">{rol.nombre}</span>
                  <span className="text-xs text-gray-500">{rol.permisos.length} permisos · {rol.activo ? 'Activo' : 'Inactivo'}</span>
                </button>
              ))}
              {!roles.length && <p className="text-sm text-gray-500">No se pudieron cargar roles o no existen registros.</p>}
            </div>

            <div>
              {rolSeleccionado ? (
                <>
                  <p className="font-semibold text-gray-900 dark:text-white">Permisos de {rolSeleccionado.nombre}</p>
                  <p className="mt-1 text-sm text-gray-500">Marca las pantallas y luego presiona Guardar permisos. Dashboard y Mi perfil son accesos personales fijos.</p>
                  <div className="mt-5 space-y-4">
                    {GRUPOS.map((grupo) => {
                      const modificables = grupo.pantallas.filter((pantalla) => !pantalla.fija)
                      const cuenta = grupo.pantallas.filter((pantalla) => pantalla.fija || codigosSeleccionados.includes(pantalla.codigo)).length
                      const todosMarcados = modificables.length > 0 && modificables.every((pantalla) => codigosSeleccionados.includes(pantalla.codigo))
                      return (
                        <div key={grupo.titulo} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white">{grupo.titulo}</h3>
                              <span className="text-xs text-gray-500">{cuenta}/{grupo.pantallas.length}</span>
                            </div>
                            {modificables.length > 0 && <button type="button" disabled={guardando} className="text-xs font-medium text-blue-600 underline disabled:opacity-50" onClick={() => marcarGrupo(grupo, !todosMarcados)}>{todosMarcados ? 'Desmarcar grupo' : 'Marcar grupo'}</button>}
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {grupo.pantallas.map((pantalla) => (
                              <label key={pantalla.codigo} className="flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-3 text-sm dark:border-gray-800">
                                <input
                                  type="checkbox"
                                  className="mt-1 size-4 accent-blue-600"
                                  disabled={guardando || pantalla.fija}
                                  checked={pantalla.fija || codigosSeleccionados.includes(pantalla.codigo)}
                                  onChange={(e) => marcar(pantalla.codigo, e.target.checked)}
                                />
                                <span className="min-w-0">
                                  <span className="block font-medium text-gray-900 dark:text-white">
                                    {pantalla.nombre}
                                  </span>
                                </span>

                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {permisosAdicionales.length > 0 && (
                    <div className="mt-5 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                      <h3 className="mb-1 font-semibold">Otros permisos registrados</h3>
                      <p className="mb-3 text-xs text-gray-500">Se conservan los permisos creados previamente, aunque no correspondan a pantallas.</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {permisosAdicionales.map((permiso) => (
                          <label key={permiso.id} className="flex items-start gap-3 text-sm">
                            <input type="checkbox" className="mt-1 size-4 accent-blue-600" disabled={guardando} checked={codigosSeleccionados.includes(permiso.codigo)} onChange={(e) => marcar(permiso.codigo, e.target.checked)} />
                            <span className="font-medium">
                              {permiso.nombre}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <button type="button" className={`${boton} mt-6`} disabled={guardando} onClick={() => void guardarPermisos()}>
                    <Save size={17} /> {guardando ? 'Guardando...' : 'Guardar permisos'}
                  </button>
                </>
              ) : <p className="text-sm text-gray-500">Selecciona un rol para configurar sus accesos.</p>}
            </div>
          </div>
        )}
      </section>

      <details className={tarjeta}>
        <summary className="flex cursor-pointer items-center gap-2 font-semibold"><CheckSquare2 size={19} /> Crear un permiso personalizado (opcional)</summary>
        <p className="mt-2 text-sm text-gray-500">Para las pantallas de la checklist no debes escribir códigos. Este formulario es solo para permisos adicionales, como acciones específicas.</p>
        <form onSubmit={(e) => void crearPermiso(e)} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div><label className="mb-2 block text-sm font-medium" htmlFor="permiso-codigo">Código único</label><input id="permiso-codigo" className={campo} required maxLength={80} placeholder="EJEMPLO_CREAR" value={permisoCodigo} onChange={(e) => setPermisoCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))} /></div>
          <div><label className="mb-2 block text-sm font-medium" htmlFor="permiso-nombre">Nombre</label><input id="permiso-nombre" className={campo} required maxLength={100} placeholder="Crear ejemplo" value={permisoNombre} onChange={(e) => setPermisoNombre(e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="mb-2 block text-sm font-medium" htmlFor="permiso-descripcion">Descripción</label><textarea id="permiso-descripcion" className={campo} maxLength={500} rows={2} value={permisoDescripcion} onChange={(e) => setPermisoDescripcion(e.target.value)} /></div>
          <div className="sm:col-span-2"><button className={boton} type="submit" disabled={guardando}><Plus size={17} /> Crear permiso personalizado</button></div>
        </form>
      </details>

      <p className="text-sm text-amber-700 dark:text-amber-300">Esta pantalla registra permisos reales en PostgreSQL. La visibilidad de una pantalla no sustituye las validaciones de autorización que protegen las operaciones del servidor.</p>
    </div>
  )
}
