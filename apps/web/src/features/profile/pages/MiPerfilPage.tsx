import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  LockKeyhole,
  UserRound,
  MapPin,
  ShieldCheck,
  Pencil,
  Camera,
  Trash2,
  X,
} from 'lucide-react'

import { useAuth } from '@/features/auth/AuthProvider'
import { esSupervisorCalendario } from '@/features/auth/calendarAccess'

export default function MiPerfilPage() {
  const { usuario, verificarSesion } = useAuth()
  const puedeEditarDatos = !!usuario && esSupervisorCalendario(usuario)

  // Modal de información personal y fotografía.
  const modalPerfilRef = useRef<HTMLDialogElement>(null)
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [perfilActualizado, setPerfilActualizado] = useState(false)
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [errorPerfil, setErrorPerfil] = useState('')

  // La fotografía se consulta en la API autenticada, no en la sesión.
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [fotoVersion, setFotoVersion] = useState(0)
  const [fotoArchivo, setFotoArchivo] = useState<File | null>(null)
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>(null)
  const [quitarFoto, setQuitarFoto] = useState(false)

  useEffect(() => {
    if (!usuario?.id) {
      setFotoUrl(null)
      return
    }

    const controller = new AbortController()
    let urlTemporal: string | null = null

    async function cargarFotografia() {
      setFotoUrl(null)
      try {
        const respuesta = await fetch('/api/v1/perfil/foto', {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!respuesta.ok) return
        const imagen = await respuesta.blob()
        if (controller.signal.aborted) return

        urlTemporal = URL.createObjectURL(imagen)
        setFotoUrl(urlTemporal)
      } catch {
        // Si no existe fotografía o falla la red, mostramos el avatar predeterminado.
      }
    }

    void cargarFotografia()
    return () => {
      controller.abort()
      if (urlTemporal) URL.revokeObjectURL(urlTemporal)
    }
  }, [usuario?.id, fotoVersion])

  useEffect(() => {
    if (!fotoArchivo) {
      setFotoPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(fotoArchivo)
    setFotoPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [fotoArchivo])

  function abrirEditorPerfil() {
    if (!usuario) return
    setNombre(usuario.nombre)
    setApellido(usuario.apellido ?? '')
    setCorreo(usuario.correo)
    setTelefono(usuario.telefono ?? '')
    setFotoArchivo(null)
    setQuitarFoto(false)
    setErrorPerfil('')
    setPerfilActualizado(false)
    setEditandoPerfil(true)
  }

  function cerrarEditorPerfil() {
    if (guardandoPerfil) return
    setEditandoPerfil(false)
    setFotoArchivo(null)
    setQuitarFoto(false)
    setErrorPerfil('')
  }

  function seleccionarFoto(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0]
    event.target.value = ''
    if (!archivo) return

    if (archivo.type !== 'image/jpeg' && archivo.type !== 'image/png') {
      setErrorPerfil('Selecciona una fotografía JPG o PNG.')
      return
    }
    if (archivo.size === 0 || archivo.size > 2 * 1024 * 1024) {
      setErrorPerfil('La fotografía debe pesar más de 0 bytes y máximo 2 MB.')
      return
    }
    setErrorPerfil('')
    setFotoArchivo(archivo)
    setQuitarFoto(false)
  }

  useEffect(() => {
    const modal = modalPerfilRef.current
    if (!modal) return
    if (editandoPerfil && !modal.open) modal.showModal()
    if (!editandoPerfil && modal.open) modal.close()
  }, [editandoPerfil])

  async function guardarPerfil(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (guardandoPerfil) return
    setErrorPerfil('')

    if (puedeEditarDatos && (!nombre.trim() || !correo.trim())) {
      setErrorPerfil('El nombre y el correo son obligatorios.')
      return
    }

    setGuardandoPerfil(true)
    let datosGuardados = false
    try {
      const respuesta = await fetch('/api/v1/perfil', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(puedeEditarDatos ? {
          nombre: nombre.trim(), apellido: apellido.trim(), correo: correo.trim(), telefono: telefono.trim(),
        } : { telefono: telefono.trim() }),
      })

      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => null)
        setErrorPerfil(datos?.error?.message ?? 'No fue posible guardar los cambios.')
        return
      }
      datosGuardados = true

      if (fotoArchivo || quitarFoto) {
        const respuestaFoto = fotoArchivo
          ? await fetch('/api/v1/perfil/foto', {
              method: 'PUT',
              credentials: 'same-origin',
              headers: { 'Content-Type': fotoArchivo.type },
              body: fotoArchivo,
            })
          : await fetch('/api/v1/perfil/foto', {
              method: 'DELETE',
              credentials: 'same-origin',
            })

        if (!respuestaFoto.ok) {
          const datos = await respuestaFoto.json().catch(() => null)
          await verificarSesion()
          setErrorPerfil(
            'Los datos personales se guardaron, pero la fotografía no: ' +
              (datos?.error?.message ?? 'No se pudo guardar la fotografía.'),
          )
          return
        }
        setFotoVersion((version) => version + 1)
        window.dispatchEvent(new Event('viviendas-leon:photo-updated'))
      }

      if (!(await verificarSesion())) {
        setErrorPerfil('Los cambios se guardaron, pero no pudimos actualizar la sesión. Inicia sesión otra vez.')
        return
      }

      setPerfilActualizado(true)
      setEditandoPerfil(false)
      setFotoArchivo(null)
      setQuitarFoto(false)
    } catch {
      setErrorPerfil(
        datosGuardados
          ? 'Los datos personales se guardaron, pero hubo un problema al actualizar la fotografía o la sesión.'
          : 'No fue posible conectar con el servidor.',
      )
    } finally {
      setGuardandoPerfil(false)
    }
  }

  // Edición de dirección: solo Departamento, Municipio y Dirección.
  const modalDireccionRef = useRef<HTMLDialogElement>(null)
  const [editandoDireccion, setEditandoDireccion] = useState(false)
  const [departamento, setDepartamento] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [ubicaciones, setUbicaciones] = useState<Record<string, string[]>>({})
  const departamentos = Object.keys(ubicaciones)
  const municipiosDisponibles = ubicaciones[departamento] ?? []
  const [direccion, setDireccion] = useState('')
  const [guardandoDireccion, setGuardandoDireccion] = useState(false)
  const [errorDireccion, setErrorDireccion] = useState('')
  const [direccionActualizada, setDireccionActualizada] = useState(false)

  useEffect(() => {
    if (!editandoDireccion) return
    const controller = new AbortController()
    void fetch('/api/v1/perfil/ubicaciones', { credentials: 'same-origin', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('No se pudo cargar el catálogo territorial.')
        return response.json() as Promise<{ municipiosPorDepartamento: Record<string, string[]> }>
      })
      .then(data => { if (!controller.signal.aborted) setUbicaciones(data.municipiosPorDepartamento) })
      .catch(() => { if (!controller.signal.aborted) setErrorDireccion('No se pudieron cargar los municipios.') })
    return () => controller.abort()
  }, [editandoDireccion])

  function abrirEditorDireccion() {
    if (!usuario) return
    setDepartamento(usuario.departamento ?? '')
    setMunicipio(usuario.municipio ?? '')
    setDireccion(usuario.direccion ?? '')
    setErrorDireccion('')
    setDireccionActualizada(false)
    setEditandoDireccion(true)
  }

  function cerrarEditorDireccion() {
    if (guardandoDireccion) return
    setEditandoDireccion(false)
    setErrorDireccion('')
  }

  useEffect(() => {
    const modal = modalDireccionRef.current
    if (!modal) return
    if (editandoDireccion && !modal.open) modal.showModal()
    if (!editandoDireccion && modal.open) modal.close()
  }, [editandoDireccion])

  async function guardarDireccion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (guardandoDireccion) return
    setErrorDireccion('')

    if (
      departamento.trim().length > 100 ||
      municipio.trim().length > 100 ||
      direccion.trim().length > 255 ||
      (!!departamento && !municipiosDisponibles.includes(municipio))
    ) {
      setErrorDireccion('Selecciona un municipio válido o revisa la dirección.')
      return
    }

    setGuardandoDireccion(true)
    try {
      const respuesta = await fetch('/api/v1/perfil/direccion', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departamento: departamento.trim(),
          municipio: municipio.trim(),
          direccion: direccion.trim(),
        }),
      })

      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => null)
        setErrorDireccion(datos?.error?.message ?? 'No fue posible guardar la dirección.')
        return
      }

      if (!(await verificarSesion())) {
        setErrorDireccion('La dirección se guardó, pero no pudimos actualizar la sesión. Inicia sesión otra vez.')
        return
      }

      setDireccionActualizada(true)
      setEditandoDireccion(false)
    } catch {
      setErrorDireccion('No fue posible conectar con el servidor.')
    } finally {
      setGuardandoDireccion(false)
    }
  }

  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-3 ' +
    'text-sm text-gray-900 outline-none focus:border-brand-500 ' +
    'focus:ring-2 focus:ring-brand-500/20 ' +
    'dark:border-gray-700 dark:bg-gray-900 dark:text-white'

  const cardClass =
    'rounded-2xl border border-gray-200 bg-white p-6 ' +
    'dark:border-gray-800 dark:bg-gray-900'

  async function cambiarPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (guardando) return

    setError('')
    setMensaje('')

    if (passwordNueva.length < 12 || passwordNueva.length > 128) {
      setError('La contraseña debe tener entre 12 y 128 caracteres.')
      return
    }

    if (passwordNueva !== confirmarPassword) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }

    if (passwordActual === passwordNueva) {
      setError('La nueva contraseña debe ser diferente de la actual.')
      return
    }

    setGuardando(true)

    try {
      const response = await fetch('/api/v1/auth/password', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passwordActual,
          passwordNueva,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)

        setError(
          data?.error?.message ??
            'No fue posible actualizar la contraseña.',
        )

        return
      }

      setPasswordActual('')
      setPasswordNueva('')
      setConfirmarPassword('')

      setMensaje('Tu contraseña se actualizó correctamente.')
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setGuardando(false)
    }
  }

  if (!usuario) {
    return (
      <main className="p-6">
        <p>No se pudo obtener la información del perfil.</p>
      </main>
    )
  }

  const datos = [
    {
      label: 'Nombre',
      value: usuario.nombre,
    },
    {
      label: 'Apellido',
      value: usuario.apellido || 'No registrado',
    },
    {
      label: 'Correo electrónico',
      value: usuario.correo,
    },
    {
      label: 'Número de teléfono',
      value: usuario.telefono || 'No registrado',
    },
    {
      label: 'Rol',
      value: usuario.roles.join(', ') || 'Sin rol',
    },
    {
      label: 'Estado',
      value: 'Activo',
    },
  ]

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Mi perfil
        </h1>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Consulta tu perfil y tus datos de contacto.
        </p>
      </div>

      {/* Tarjeta principal */}
      <section className={cardClass}>
        <div className="flex items-center gap-4">
          <button type="button" onClick={abrirEditorPerfil}
            title="Cambiar fotografía"
            aria-label="Cambiar fotografía de perfil"
            className="group relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-brand-600 ring-2 ring-brand-100 transition-transform hover:scale-[1.03] dark:bg-brand-500/10 sm:size-24">
            {fotoUrl ? <img src={fotoUrl} alt="" className="h-full w-full object-cover" /> : <UserRound size={30} aria-hidden="true" />}
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><Camera size={23} /></span>
          </button>

          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {usuario.nombre} {usuario.apellido ?? ''}
            </h2>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              {usuario.roles.join(', ') || 'Sin rol asignado'}
            </p>

            <p className="break-all text-sm text-gray-500 dark:text-gray-400">
              {usuario.correo}
            </p>
          </div>
        </div>
      </section>

      {/* Información personal */}
      <section className={cardClass}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <UserRound className="text-brand-600" size={22} />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Información personal
            </h2>
          </div>

          <button
            type="button"
            onClick={abrirEditorPerfil}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
          >
            <Pencil size={16} />
            Editar
          </button>
        </div>

        {perfilActualizado && (
          <p role="status" className="mb-5 text-sm text-green-700 dark:text-green-400">
            Tu información personal se actualizó correctamente.
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {datos.map((dato) => (
            <div key={dato.label}>
              <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                {dato.label}
              </p>

              <p className="break-words text-sm font-medium text-gray-900 dark:text-white">
                {dato.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Formulario modal de edición del perfil */}
      <dialog
        ref={modalPerfilRef}
        aria-labelledby="titulo-editar-perfil"
        onCancel={(event) => {
          event.preventDefault()
          cerrarEditorPerfil()
        }}
        className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-xl backdrop:bg-black/50 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2
                id="titulo-editar-perfil"
                className="text-xl font-bold text-gray-900 dark:text-white"
              >
                Editar información personal
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Editar datos personales
              </p>
            </div>
            <button
              type="button"
              aria-label="Cerrar ventana"
              onClick={cerrarEditorPerfil}
              disabled={guardandoPerfil}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
            >
              <X size={22} />
            </button>
          </div>

          <form onSubmit={(event) => void guardarPerfil(event)}>
            <div className="mb-6 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10">
                  {fotoPreviewUrl || (!quitarFoto && fotoUrl) ? (
                    <img
                      src={fotoPreviewUrl || fotoUrl || undefined}
                      alt="Vista previa de fotografía de perfil"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserRound size={34} aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="foto-perfil" className="mb-2 flex items-center gap-2 text-sm font-semibold dark:text-white">
                    <Camera size={17} /> Fotografía de perfil
                  </label>
                  <input
                    id="foto-perfil"
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={seleccionarFoto}
                    disabled={guardandoPerfil}
                    className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:text-gray-200"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">JPG o PNG · 2 MB máx.</p>
                  {(fotoUrl || fotoArchivo || quitarFoto) && (
                    <button
                      type="button"
                      disabled={guardandoPerfil}
                      onClick={() => {
                        setFotoArchivo(null)
                        setQuitarFoto(true)
                        setErrorPerfil('')
                      }}
                      className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      <Trash2 size={15} /> Quitar fotografía
                    </button>
                  )}
                  {quitarFoto && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      La fotografía se eliminará al presionar Guardar cambios.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="perfil-nombre" className="mb-2 block text-sm font-medium dark:text-white">
                  Nombre
                </label>
                <input
                  id="perfil-nombre"
                  autoFocus
                  className={inputClass}
                  disabled={!puedeEditarDatos}
                  maxLength={100}
                  required
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="perfil-apellido" className="mb-2 block text-sm font-medium dark:text-white">
                  Apellido
                </label>
                <input
                  id="perfil-apellido"
                  className={inputClass}
                  disabled={!puedeEditarDatos}
                  maxLength={100}
                  value={apellido}
                  onChange={(event) => setApellido(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="perfil-correo" className="mb-2 block text-sm font-medium dark:text-white">
                  Correo electrónico
                </label>
                <input
                  id="perfil-correo"
                  type="email"
                  className={inputClass}
                  disabled={!puedeEditarDatos}
                  maxLength={254}
                  required
                  value={correo}
                  onChange={(event) => setCorreo(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="perfil-telefono" className="mb-2 block text-sm font-medium dark:text-white">
                  Teléfono
                </label>
                <input
                  id="perfil-telefono"
                  type="tel"
                  className={inputClass}
                  maxLength={30}
                  value={telefono}
                  onChange={(event) => setTelefono(event.target.value)}
                />
              </div>
            </div>

            <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">
              {puedeEditarDatos ? 'El rol y el estado se administran desde Usuarios.' : 'Puedes cambiar tu fotografía y teléfono.'}
            </p>

            {errorPerfil && (
              <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {errorPerfil}
              </p>
            )}

            <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-800">
              <button
                type="button"
                onClick={cerrarEditorPerfil}
                disabled={guardandoPerfil}
                className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoPerfil}
                className="rounded-lg bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {guardandoPerfil ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </dialog>

      {/* Dirección en modo consulta */}
      <section className={cardClass}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MapPin className="text-brand-600" size={22} />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dirección</h2>
          </div>
          {puedeEditarDatos && <button
            type="button"
            onClick={abrirEditorDireccion}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
          >
            <Pencil size={16} /> Editar
          </button>}
        </div>

        {direccionActualizada && (
          <p role="status" className="mb-5 text-sm text-green-700 dark:text-green-400">
            Tu dirección se actualizó correctamente.
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">Departamento</p>
            <p className="break-words text-sm font-medium text-gray-900 dark:text-white">
              {usuario.departamento || 'No registrado'}
            </p>
          </div>
          <div>
            <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">Municipio</p>
            <p className="break-words text-sm font-medium text-gray-900 dark:text-white">
              {usuario.municipio || 'No registrado'}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">Dirección</p>
            <p className="break-words text-sm font-medium text-gray-900 dark:text-white">
              {usuario.direccion || 'No registrada'}
            </p>
          </div>
        </div>
      </section>

      {/* Ventana modal de dirección */}
      <dialog
        ref={modalDireccionRef}
        aria-labelledby="titulo-editar-direccion"
        onCancel={(event) => {
          event.preventDefault()
          cerrarEditorDireccion()
        }}
        className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-xl backdrop:bg-black/50 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 id="titulo-editar-direccion" className="text-xl font-bold text-gray-900 dark:text-white">
                Editar dirección
              </h2>

            </div>
            <button
              type="button"
              aria-label="Cerrar ventana de dirección"
              onClick={cerrarEditorDireccion}
              disabled={guardandoDireccion}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
            >
              <X size={22} />
            </button>
          </div>

          <form onSubmit={(event) => void guardarDireccion(event)}>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="perfil-departamento" className="mb-2 block text-sm font-medium dark:text-white">
                  Departamento
                </label>
                <select id="perfil-departamento" autoFocus className={inputClass} value={departamento}
                  onChange={event => { setDepartamento(event.target.value); setMunicipio('') }}>
                  <option value="">Seleccionar departamento</option>
                  {departamentos.map(nombre => <option key={nombre} value={nombre}>{nombre}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="perfil-municipio" className="mb-2 block text-sm font-medium dark:text-white">
                  Municipio
                </label>
                <select id="perfil-municipio" className={inputClass} value={municipio} disabled={!departamento || departamentos.length === 0}
                  onChange={event => setMunicipio(event.target.value)}>
                  <option value="">Seleccionar municipio</option>
                  {municipiosDisponibles.map(nombre => <option key={nombre} value={nombre}>{nombre}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="perfil-direccion" className="mb-2 block text-sm font-medium dark:text-white">
                  Dirección
                </label>
                <textarea
                  id="perfil-direccion"
                  className={inputClass}
                  rows={3}
                  maxLength={255}
                  value={direccion}
                  onChange={(event) => setDireccion(event.target.value)}
                />
              </div>
            </div>

            {errorDireccion && (
              <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {errorDireccion}
              </p>
            )}
            <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-800">
              <button
                type="button"
                onClick={cerrarEditorDireccion}
                disabled={guardandoDireccion}
                className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoDireccion}
                className="rounded-lg bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {guardandoDireccion ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </dialog>

      {/* Seguridad */}
      <section className={cardClass}>
        <div className="mb-4 flex items-center gap-3">
          <ShieldCheck className="text-brand-600" size={22} />

          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Seguridad
          </h2>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <LockKeyhole className="text-gray-500" size={20} />

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Cambiar contraseña
            </h3>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Solo puedes modificar la contraseña
              de tu propia cuenta.
            </p>
          </div>
        </div>

        <form
          onSubmit={cambiarPassword}
          className="max-w-xl space-y-5"
        >
          {/* Contraseña actual */}
          <div>
            <label
              htmlFor="passwordActual"
              className="mb-2 block text-sm font-medium dark:text-white"
            >
              Contraseña actual
            </label>

            <input
              id="passwordActual"
              type="password"
              autoComplete="current-password"
              required
              value={passwordActual}
              onChange={(e) =>
                setPasswordActual(e.target.value)
              }
              className={inputClass}
            />
          </div>

          {/* Nueva contraseña */}
          <div>
            <label
              htmlFor="passwordNueva"
              className="mb-2 block text-sm font-medium dark:text-white"
            >
              Nueva contraseña
            </label>

            <input
              id="passwordNueva"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={passwordNueva}
              onChange={(e) =>
                setPasswordNueva(e.target.value)
              }
              className={inputClass}
            />

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Debe tener entre 12 y 128 caracteres.
            </p>
          </div>

          {/* Confirmación */}
          <div>
            <label
              htmlFor="confirmarPassword"
              className="mb-2 block text-sm font-medium dark:text-white"
            >
              Confirmar nueva contraseña
            </label>

            <input
              id="confirmarPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmarPassword}
              onChange={(e) =>
                setConfirmarPassword(e.target.value)
              }
              className={inputClass}
            />
          </div>

          {/* Errores */}
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {/* Confirmación */}
          {mensaje && (
            <p
              role="status"
              className="rounded-lg bg-green-50 p-3 text-sm text-green-700"
            >
              {mensaje}
            </p>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {guardando
              ? 'Actualizando...'
              : 'Actualizar contraseña'}
          </button>
        </form>
      </section>
    </main>
  )
}
