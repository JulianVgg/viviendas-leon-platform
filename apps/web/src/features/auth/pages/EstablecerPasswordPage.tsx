
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../AuthProvider'

export default function EstablecerPasswordPage() {
  const navigate = useNavigate()
  const { verificarSesion, cerrarSesion } = useAuth()

  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (guardando) return

    setError('')

    if (nueva.length < 12 || nueva.length > 128) {
      setError('La contraseña debe tener entre 12 y 128 caracteres.')
      return
    }

    if (nueva !== confirmacion) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }

    if (actual === nueva) {
      setError('La nueva contraseña debe ser diferente.')
      return
    }

    setGuardando(true)

    try {
      const respuesta = await fetch('/api/v1/auth/password', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passwordActual: actual,
          passwordNueva: nueva,
        }),
      })

      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => null)
        setError(datos?.error?.message ?? 'No se pudo cambiar la contraseña.')
        return
      }

      setActual('')
      setNueva('')
      setConfirmacion('')

      const sesionValida = await verificarSesion()

      if (!sesionValida) {
        navigate('/login', { replace: true })
        return
      }

      navigate('/', { replace: true })
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setGuardando(false)
    }
  }

  async function salir() {
    try {
      await cerrarSesion()
      navigate('/login', { replace: true })
    } catch {
      setError('No se pudo cerrar la sesión.')
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 ' +
    'text-gray-900 outline-none focus:border-blue-500 ' +
    'dark:border-gray-700 dark:text-white'

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Establecer mi contraseña
        </h1>

        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Por seguridad, debes crear tu contraseña personal antes
          de utilizar Viviendas León.
        </p>

        <form onSubmit={guardar} className="mt-8 space-y-5">
          <div>
            <label htmlFor="passwordActual" className="mb-2 block text-sm font-medium">
              Contraseña temporal
            </label>
            <input
              id="passwordActual"
              type="password"
              autoComplete="current-password"
              required
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="passwordNueva" className="mb-2 block text-sm font-medium">
              Nueva contraseña
            </label>
            <input
              id="passwordNueva"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="confirmacion" className="mb-2 block text-sm font-medium">
              Confirmar nueva contraseña
            </label>
            <input
              id="confirmacion"
              type="password"
              autoComplete="new-password"
              required
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => void salir()}
          className="mt-5 w-full text-sm text-gray-500 hover:underline"
        >
          Cerrar sesión
        </button>
      </div>
    </main>
  )
}
