
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../AuthProvider'
import BrandMark from '@/components/common/BrandMark'

export default function LoginPage() {
  const navigate = useNavigate()
  const { verificarSesion } = useAuth()

  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mostrarAviso, setMostrarAviso] = useState(false)

  async function iniciarSesion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (cargando) return

    setError('')
    setCargando(true)

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correo: correo.trim(),
          password,
        }),
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 400) {
          setError('Correo electrónico o contraseña incorrectos.')
        } else {
          setError('No fue posible iniciar sesión. Intenta nuevamente.')
        }
        return
      }

      // AUTH-02: Comprobar que el servidor reconoce la sesión.
      const sesionValida = await verificarSesion()

      if (!sesionValida) {
        setError(
          'No fue posible verificar tu sesión. Intenta nuevamente.',
        )
        return
      }

      // Limpiar la contraseña del formulario.
      setPassword('')

      // Entrar al panel únicamente con una sesión válida.
      navigate('/', { replace: true })
    } catch {
      setError('No fue posible conectar con el servidor.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-dvh bg-white dark:bg-slate-950">
      {/* Logotipo visible también en móviles; acceso y sesión intactos. */}
      <main className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <BrandMark decorative className="size-12 shadow-theme-sm" />
            <div><p className="text-lg font-bold text-slate-900 dark:text-white">ViviendasLeón</p><p className="text-xs text-slate-500 dark:text-slate-400">Sustaining Rural Communities</p></div>
          </div>
          <div className="mb-6 hidden h-1 w-16 rounded-full bg-brand-500 lg:block" />
          <h1 className="mb-3 text-3xl font-bold text-slate-900 dark:text-white">
            Iniciar sesión
          </h1>

          <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
            Ingresa tus credenciales para acceder a Viviendas León.
          </p>

          <form onSubmit={iniciarSesion} className="space-y-6">
            {/* Correo electrónico */}
            <div>
              <label
                htmlFor="correo"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Correo electrónico
              </label>

              <input
                id="correo"
                type="email"
                autoComplete="username"
                required
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full rounded-lg border border-slate-300 bg-transparent px-4 py-3 text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:text-white"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Contraseña
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="w-full rounded-lg border border-slate-300 bg-transparent px-4 py-3 pr-24 text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:text-white"
                />

                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute inset-y-0 right-3 text-sm text-brand-600"
                  aria-label={
                    mostrarPassword
                      ? 'Ocultar contraseña'
                      : 'Mostrar contraseña'
                  }
                >
                  {mostrarPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            {/* Recuperación de contraseña */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => setMostrarAviso(true)}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {mostrarAviso && (
              <p
                role="status"
                className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800"
              >
                La recuperación de contraseñas todavía no está habilitada.
                Solicita ayuda a la administración.
              </p>
            )}

            {/* Mensajes de error */}
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {/* Botón de inicio de sesión */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-lg bg-brand-500 px-4 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </main>

      {/* Panel institucional, sin imágenes externas: funciona en modo PWA. */}
      <aside className="relative hidden min-h-dvh w-1/2 items-center justify-center overflow-hidden bg-brand-900 px-8 lg:flex">
        <div aria-hidden="true" className="pointer-events-none absolute -right-36 -top-36 size-[420px] rounded-full border border-white/10 bg-white/5" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-40 size-[520px] rounded-full border border-white/10 bg-white/5" />
        <div className="relative flex max-w-md flex-col items-center text-center">
          <div className="rounded-3xl border border-white/20 bg-white/10 p-5 shadow-theme-lg backdrop-blur-sm">
            <BrandMark decorative className="size-28 rounded-xl shadow-theme-lg" />
          </div>
          <h2 className="mt-8 text-4xl font-bold tracking-tight text-white">Viviendas León</h2>
          <p className="mt-3 text-base text-brand-200">Sustaining Rural Communities</p>
          <div className="mt-8 h-px w-24 bg-brand-300/60" />
          <p className="mt-6 text-sm leading-6 text-brand-100">Gestión de programas y acompañamiento a comunidades rurales.</p>
        </div>
      </aside>
    </div>
  )
}
