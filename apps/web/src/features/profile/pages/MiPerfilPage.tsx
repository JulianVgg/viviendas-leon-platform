
import { useState, type FormEvent } from 'react'
import {
  LockKeyhole,
  UserRound,
  MapPin,
  ShieldCheck,
} from 'lucide-react'

import { useAuth } from '@/features/auth/AuthProvider'

// AUTH-04: Formulario para editar datos personales
import EditarDatosPerfil from '@/features/profile/components/EditarDatosPerfil'

export default function MiPerfilPage() {
  const { usuario } = useAuth()

  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-3 ' +
    'text-sm text-gray-900 outline-none focus:border-blue-500 ' +
    'focus:ring-2 focus:ring-blue-500/20 ' +
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
          Consulta tu información personal y administra
          la seguridad de tu cuenta.
        </p>
      </div>

      {/* Tarjeta principal */}
      <section className={cardClass}>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10">
            <UserRound size={30} />
          </div>

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
        <div className="mb-6 flex items-center gap-3">
          <UserRound className="text-blue-600" size={22} />

          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Información personal
          </h2>
        </div>

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

      {/* AUTH-04: Editar datos personales */}
      <EditarDatosPerfil />

      {/* Dirección */}
      <section className={cardClass}>
        <div className="mb-4 flex items-center gap-3">
          <MapPin className="text-blue-600" size={22} />

          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Dirección
          </h2>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          No hay información de dirección registrada
          para esta cuenta.
        </p>

        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          Esta sección se conectará cuando el sistema
          disponga de los campos de dirección del personal.
        </p>
      </section>

      {/* Seguridad */}
      <section className={cardClass}>
        <div className="mb-4 flex items-center gap-3">
          <ShieldCheck className="text-blue-600" size={22} />

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
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
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
