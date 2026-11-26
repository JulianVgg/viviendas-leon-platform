import { Navigate } from 'react-router'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath } from '@/features/auth/screenPermissions'

export default function AuditLandingPage() {
  const { usuario } = useAuth()
  if (!usuario) return null
  if (canViewPath(usuario, '/auditoria/bitacora')) return <Navigate to="/auditoria/bitacora" replace />
  if (canViewPath(usuario, '/finanzas/informe-mensual')) return <Navigate to="/finanzas/informe-mensual" replace />
  return <p role="alert" className="p-6 text-sm">No tienes permiso para consultar auditoría.</p>
}
