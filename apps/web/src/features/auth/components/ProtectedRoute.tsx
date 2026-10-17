
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../AuthProvider'

export default function ProtectedRoute() {
  const { usuario, cargando } = useAuth()
  const location = useLocation()

  if (cargando) {
    return (
      <div
        role="status"
        className="flex min-h-dvh items-center justify-center"
      >
        <p>Verificando sesión...</p>
      </div>
    )
  }

  if (!usuario) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    )
  }

  const rutaPassword = '/establecer-password'

  if (usuario.debeCambiarPassword) {
    if (location.pathname !== rutaPassword) {
      return <Navigate to={rutaPassword} replace />
    }
  } else if (location.pathname === rutaPassword) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
