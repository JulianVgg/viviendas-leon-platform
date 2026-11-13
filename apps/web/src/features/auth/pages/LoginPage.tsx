
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../AuthProvider'
import BrandMark from '@/components/common/BrandMark'
import { fieldAccessExists } from '../services/fieldAccess'

export default function LoginPage() {
  const navigate = useNavigate()
  const { verificarSesion, accederModoCampo } = useAuth()

  const [offlineAvailable, setOfflineAvailable] = useState(false)
  const [offlineKey, setOfflineKey] = useState('')
  const [offlineBusy, setOfflineBusy] = useState(false)
  const [offlineError, setOfflineError] = useState('')
  const [correo, setCorreo] = useState(() => localStorage.getItem('login:correo-recordado') || '')
  const [recordarme, setRecordarme] = useState(() => Boolean(localStorage.getItem('login:correo-recordado')))
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mostrarAviso, setMostrarAviso] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const temporizadorSalida = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (temporizadorSalida.current !== null) clearTimeout(temporizadorSalida.current)
  }, [])
  useEffect(() => { void fieldAccessExists().then(setOfflineAvailable).catch(() => setOfflineAvailable(false)) }, [])

  async function openOffline(event: FormEvent) {
    event.preventDefault()
    if (offlineBusy) return
    setOfflineBusy(true); setOfflineError('')
    try {
      await accederModoCampo(offlineKey)
      setOfflineKey('')
      navigate('/visitas/nueva', { replace: true })
    } catch (cause) { setOfflineError(cause instanceof Error ? cause.message : 'No se pudo abrir el modo de campo.') }
    finally { setOfflineBusy(false) }
  }

  async function iniciarSesion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (cargando || saliendo) return

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
          recordarme,
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

      // Nuevo inicio de sesión real: ya no queda un cierre local pendiente.
      localStorage.removeItem('field:logout-pending')
      // AUTH-02: Comprobar que el servidor reconoce la sesión.
      const sesionValida = await verificarSesion()

      if (!sesionValida) {
        setError(
          'No fue posible verificar tu sesión. Intenta nuevamente.',
        )
        return
      }

      // Recordar solo el correo; la sesión persistente permanece en una cookie HttpOnly.
      if (recordarme) localStorage.setItem('login:correo-recordado', correo.trim())
      else localStorage.removeItem('login:correo-recordado')
      setPassword('')

      // La transición de salida solo se ejecuta tras validar la sesión.
      // No se retrasa el acceso cuando el dispositivo prefiere reducir movimiento.
      const destino = { replace: true, state: { fromLogin: true } }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        navigate('/', destino)
      } else {
        setSaliendo(true)
        temporizadorSalida.current = window.setTimeout(() => navigate('/', destino), 320)
      }
    } catch {
      setError('No fue posible conectar con el servidor.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className={`flex min-h-dvh bg-white dark:bg-slate-950 ${saliendo ? 'login-screen-exit' : ''}`}>
      {/* Logotipo visible también en móviles; acceso y sesión intactos. */}
      <main className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="login-form-enter w-full max-w-md">
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
                className="w-full rounded-lg border border-slate-300 bg-transparent px-4 py-3 text-slate-900 outline-none transition-[border-color,box-shadow] duration-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 motion-reduce:transition-none dark:border-slate-700 dark:text-white"
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
                  className="w-full rounded-lg border border-slate-300 bg-transparent px-4 py-3 pr-24 text-slate-900 outline-none transition-[border-color,box-shadow] duration-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 motion-reduce:transition-none dark:border-slate-700 dark:text-white"
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

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={recordarme} onChange={event => setRecordarme(event.target.checked)}
                  className="size-4 rounded border-slate-300 accent-brand-600" />
                Recuérdame en este dispositivo
              </label>
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
              disabled={cargando || saliendo}
              className="w-full rounded-lg bg-brand-500 px-4 py-3 font-semibold text-white transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-theme-sm active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"
            >
              {cargando ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
          {offlineAvailable && <section className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Entrar sin conexión</h2>
            <p className="mt-1 text-xs text-slate-500">Disponible solo si preparaste este teléfono con tu cuenta técnica.</p>
            <form onSubmit={(event) => void openOffline(event)} className="mt-4 space-y-3">
              <label htmlFor="offline-key" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Clave de campo</label>
              <input id="offline-key" type="password" autoComplete="off" required minLength={8} value={offlineKey} onChange={event => setOfflineKey(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
              <button type="submit" disabled={offlineBusy} className="w-full rounded-lg border border-brand-500 px-4 py-3 font-semibold text-brand-600 disabled:opacity-50 dark:text-brand-300">{offlineBusy ? 'Verificando…' : 'Abrir modo de campo'}</button>
              {offlineError && <p role="alert" className="text-sm text-red-600">{offlineError}</p>}
            </form>
          </section>}
        </div>
      </main>

      {/* Panel institucional, sin imágenes externas: funciona en modo PWA. */}
      <aside className="relative hidden min-h-dvh w-1/2 items-center justify-center overflow-hidden bg-brand-900 px-8 lg:flex">
        <div aria-hidden="true" className="login-orbit-float pointer-events-none absolute -right-36 -top-36 size-[420px] rounded-full border border-white/10 bg-white/5" />
        <div aria-hidden="true" className="login-orbit-float-delayed pointer-events-none absolute -bottom-40 -left-40 size-[520px] rounded-full border border-white/10 bg-white/5" />
        <div className="login-side-enter relative flex max-w-md flex-col items-center text-center">
          <div className="login-brand-enter rounded-3xl border border-white/20 bg-white/10 p-5 shadow-theme-lg backdrop-blur-sm">
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
