
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Pencil, X } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'

type Props = {
  abierto: boolean
  cerrar: () => void
  guardado: () => void
}

const campo =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-3 ' +
  'text-sm text-gray-900 outline-none focus:border-blue-500 ' +
  'focus:ring-2 focus:ring-blue-500/20 ' +
  'dark:border-gray-700 dark:bg-gray-900 dark:text-white'

export default function EditarDatosPerfil({
  abierto,
  cerrar,
  guardado,
}: Props) {
  const { usuario, verificarSesion } = useAuth()
  const modalRef = useRef<HTMLDialogElement>(null)

  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!abierto || !usuario) return

    setNombre(usuario.nombre)
    setApellido(usuario.apellido ?? '')
    setCorreo(usuario.correo)
    setTelefono(usuario.telefono ?? '')
    setError('')
  }, [abierto, usuario])

  useEffect(() => {
    const modal = modalRef.current
    if (!modal) return

    if (abierto && !modal.open) {
      modal.showModal()
      modal.querySelector<HTMLInputElement>(
        '#perfil-editar-nombre'
      )?.focus()
    }

    if (!abierto && modal.open) {
      modal.close()
    }
  }, [abierto])

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (guardando) return

    setError('')

    if (!nombre.trim() || !correo.trim()) {
      setError('El nombre y el correo son obligatorios.')
      return
    }

    setGuardando(true)

    try {
      const respuesta = await fetch('/api/v1/perfil', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          correo: correo.trim(),
          telefono: telefono.trim(),
        }),
      })

      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => null)
        setError(
          datos?.error?.message ??
            'No fue posible guardar los cambios.'
        )
        return
      }

      if (!(await verificarSesion())) {
        setError(
          'Los datos se guardaron, pero no pudimos actualizar la sesión.'
        )
        return
      }

      guardado()
      cerrar()
    } catch {
      setError('No fue posible conectar con el servidor.')
    } finally {
      setGuardando(false)
    }
  }

  if (!usuario) return null

  return (
    <dialog
      ref={modalRef}
      aria-labelledby="titulo-editar-perfil"
      onCancel={(event) => {
        event.preventDefault()
        if (!guardando) cerrar()
      }}
      className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-xl backdrop:bg-black/50 dark:border-gray-800 dark:bg-gray-900"
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
              Actualiza tus datos personales.
            </p>
          </div>

          <button
            type="button"
            onClick={cerrar}
            disabled={guardando}
            aria-label="Cerrar ventana"
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mb-6 flex items-center gap-2 text-blue-600">
          <Pencil size={19} />
          <h3 className="font-semibold">Información personal</h3>
        </div>

        <form onSubmit={(e) => void guardar(e)}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="perfil-editar-nombre" className="mb-2 block text-sm font-medium">
                Nombre
              </label>
              <input
                id="perfil-editar-nombre"
                className={campo}
                maxLength={100}
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="perfil-editar-apellido" className="mb-2 block text-sm font-medium">
                Apellido
              </label>
              <input
                id="perfil-editar-apellido"
                className={campo}
                maxLength={100}
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="perfil-editar-correo" className="mb-2 block text-sm font-medium">
                Correo electrónico
              </label>
              <input
                id="perfil-editar-correo"
                type="email"
                className={campo}
                maxLength={254}
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="perfil-editar-telefono" className="mb-2 block text-sm font-medium">
                Teléfono
              </label>
              <input
                id="perfil-editar-telefono"
                type="tel"
                className={campo}
                maxLength={30}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-800">
            <button
              type="button"
              onClick={cerrar}
              disabled={guardando}
              className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-white"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
