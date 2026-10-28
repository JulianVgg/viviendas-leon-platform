
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { desactivarPushAlCerrarSesion, desvincularPushDeOtraCuenta } from '@/features/notifications/services/pushService'



type AuthUser = {
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
  verificarSesion: () => Promise<boolean>
  cerrarSesion: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<AuthUser | null>(null)
  const [cargando, setCargando] = useState(true)

  const verificarSesion = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/v1/auth/me', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      })

      if (!response.ok) {
        setUsuario(null)
        return false
      }

      const data: { usuario: AuthUser } = await response.json()
      // Un navegador compartido no debe conservar suscripciones de otra cuenta.
      try { await desvincularPushDeOtraCuenta() } catch {
        // Si el servicio push no responde, el usuario aún puede corregirlo en Notificaciones.
      }
      setUsuario(data.usuario)
      return true
    } catch {
      setUsuario(null)
      return false
    }
  }, [])

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
    // Cancelar Web Push de este navegador antes de invalidar la sesión.
    await desactivarPushAlCerrarSesion()
    const response = await fetch('/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    })

    if (!response.ok) {
      throw new Error('No se pudo cerrar la sesión.')
    }

    setUsuario(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        usuario,
        cargando,
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
