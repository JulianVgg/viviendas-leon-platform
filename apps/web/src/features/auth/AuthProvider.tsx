
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { desactivarPushAlCerrarSesion, desvincularPushDeOtraCuenta, restaurarPushRecordado } from '@/features/notifications/services/pushService'
import { lockFieldAccess, revokeFieldAccess, unlockFieldAccess, fieldAccessExists, fieldAccessActive, fieldAccessOwner } from './services/fieldAccess'
import { getFieldDownload } from '@/features/offline/services/prepareFieldData'
import { clearFieldSessionData } from '@/db/offlineDb'
import { subscribeConnectivity, getConnectivitySnapshot } from '@/services/connectivity'



export type AuthUser = {
  id: number
  nombre: string
  apellido: string | null
  telefono: string | null
  correo: string

  // Dirección del usuario
  departamento: string | null
  municipio: string | null
  direccion: string | null

  // Autenticación y permisos
  roles: string[]
  permisos: string[]
  debeCambiarPassword: boolean
}



type AuthContextValue = {
  usuario: AuthUser | null
  cargando: boolean
  modoAcceso: 'online' | 'offline'
  accederModoCampo: (clave: string) => Promise<void>
  hayModoCampo: () => Promise<boolean>
  verificarSesion: () => Promise<boolean>
  cerrarSesion: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<AuthUser | null>(null)
  const [cargando, setCargando] = useState(true)
  const [modoAcceso, setModoAcceso] = useState<'online' | 'offline'>('online')

  const verificarSesion = useCallback(async (): Promise<boolean> => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 5000)
    try {
      // Un logout hecho sin red debe invalidar la cookie del servidor antes
      // de permitir recuperar una sesión en este dispositivo.
      if (localStorage.getItem('field:logout-pending') === '1') {
        const logout = await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'same-origin' })
        if (!logout.ok) return false
        localStorage.removeItem('field:logout-pending')
        setUsuario(null)
        return false
      }
      const response = await fetch('/api/v1/auth/me', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
      })

      if (!response.ok) {
        if ([401, 403].includes(response.status)) {
          clearFieldSessionData()
          setUsuario(null)
          setModoAcceso('online')
          await revokeFieldAccess().catch(() => {})
        }
        return false
      }

      const data: { usuario: AuthUser } = await response.json()
      // Un navegador compartido no debe conservar suscripciones de otra cuenta.
      try { await desvincularPushDeOtraCuenta(data.usuario.id) } catch {
        // Si el servicio push no responde, el usuario aún puede corregirlo en Notificaciones.
      }
      // NTF-12: recordar el consentimiento tras cerrar sesión, pero revocar
      // la suscripción anterior mientras la sesión esté cerrada.
      try { await restaurarPushRecordado(data.usuario.id) } catch {
        // En navegadores sin reactivación automática, se habilita desde Notificaciones.
      }
      if (fieldAccessOwner() !== null && fieldAccessOwner() !== data.usuario.id) lockFieldAccess()
      setUsuario(current => {
        if (current && current.id !== data.usuario.id) clearFieldSessionData()
        return current && JSON.stringify(current) === JSON.stringify(data.usuario) ? current : data.usuario
      })
      setModoAcceso('online')
      return true
    } catch {
      // Error de red no equivale a una revocación de la sesión.
      // No borrar el usuario activo mientras se trabaja en campo.
      return false
    } finally { window.clearTimeout(timeout) }
  }, [])

  const accederModoCampo = useCallback(async (clave: string): Promise<void> => {
    // Si la API es accesible, una denegación de /auth/me impide evadir el cierre
    // de sesión utilizando el acceso temporal del dispositivo.
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 3500)
    try {
      const response = await fetch('/api/v1/auth/me', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal })
      if (response.ok || response.status === 401 || response.status === 403) {
        throw new Error('Hay conexión con el servidor. Inicia sesión con tu cuenta habitual.')
      }
    } catch (cause) {
      if (cause instanceof Error && cause.message.startsWith('Hay conexión con el servidor')) throw cause
      // Un error de transporte permite intentar el desbloqueo local cifrado.
    } finally { window.clearTimeout(timeout) }

    const user = await unlockFieldAccess(clave)
    const ready = await getFieldDownload(user.id)
    if (!ready) { lockFieldAccess(); throw new Error('No hay una descarga completa de campo. Prepárala con internet.') }
    setUsuario(user)
    setModoAcceso('offline')
  }, [])

  useEffect(() => {
    if (modoAcceso !== 'offline' || !usuario) return
    const expire = () => {
      if (!fieldAccessActive(usuario.id)) {
        lockFieldAccess()
        setUsuario(null)
        setModoAcceso('online')
      }
    }
    const interval = window.setInterval(expire, 60_000)
    window.addEventListener('focus', expire)
    expire()
    return () => { window.clearInterval(interval); window.removeEventListener('focus', expire) }
  }, [modoAcceso, usuario])

  useEffect(() => {
    if (modoAcceso !== 'offline' || !usuario) return
    // Nunca enviar operaciones con credenciales locales. Validar la sesión
    // real al regresar la API; el puente sincroniza solo tras esta confirmación.
    return subscribeConnectivity(() => {
      if (getConnectivitySnapshot().status === 'connected') void verificarSesion()
    })
  }, [modoAcceso, usuario, verificarSesion])

  useEffect(() => {
    let activo = true

    async function iniciar() {
      await verificarSesion()
      if (activo) {
        setCargando(false)
      }
    }

    void iniciar()

    return () => {
      activo = false
    }
  }, [verificarSesion])

  const cerrarSesion = useCallback(async () => {
    if (modoAcceso === 'offline') {
      try { localStorage.setItem('field:logout-pending', '1') } catch { throw new Error('No se pudo proteger el cierre local. Reintenta.') }
    }
    if (modoAcceso === 'online') {
      try {
        await desactivarPushAlCerrarSesion().catch(() => {})
        const response = await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'same-origin' })
        if (!response.ok) throw new Error('No se pudo cerrar la sesión.')
      } catch (cause) {
        if (navigator.onLine && getConnectivitySnapshot().status === 'connected') throw cause
        // Bloquear la sesión local inmediatamente y revocar la cookie al regresar internet.
        localStorage.setItem('field:logout-pending', '1')
      }
    }
    // El cierre local no intenta destruir las visitas pendientes: preservarlas
    // permite recuperarlas con una nueva sesión autorizada en el servidor.
    await revokeFieldAccess()
    clearFieldSessionData()
    setUsuario(null)
    setModoAcceso('online')
  }, [modoAcceso])

  return (
    <AuthContext.Provider
      value={{
        usuario,
        cargando,
        modoAcceso,
        accederModoCampo,
        hayModoCampo: fieldAccessExists,
        verificarSesion,
        cerrarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de AuthProvider')
  }

  return context
}
