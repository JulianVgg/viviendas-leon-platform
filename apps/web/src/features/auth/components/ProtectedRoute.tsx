
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../AuthProvider'

export default function ProtectedRoute() {
  const { usuario, cargando } = useAuth()
  const location = useLocation()

  if (cargando) {
    return (
      <div
        role="status"
        className="flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Verificando sesión...
          </p>
        </div>
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

  return <Outlet />
}
