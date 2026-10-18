import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../AuthProvider'
import { canViewPath } from '../screenPermissions'

// Conservamos el nombre por compatibilidad con routes.tsx, pero ahora autoriza
// según permisos REALES. No consulta el antiguo selector de rol simulado.
export default function DirectoraRoute() {
  const { usuario } = useAuth()
  const { pathname } = useLocation()
  if (!usuario) return <Navigate to="/login" replace />
  return canViewPath(usuario, pathname) ? <Outlet /> : <Navigate to="/" replace />
}
