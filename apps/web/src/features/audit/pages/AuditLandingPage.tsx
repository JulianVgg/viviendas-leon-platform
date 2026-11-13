import { Navigate } from 'react-router'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath } from '@/features/auth/screenPermissions'

export default function AuditLandingPage() {
  const { usuario } = useAuth()
  if (!usuario) return null
  if (canViewPath(usuario, '/auditoria/control-financiero')) return <Navigate to="/auditoria/control-financiero" replace />
  if (canViewPath(usuario, '/auditoria/bitacora')) return <Navigate to="/auditoria/bitacora" replace />
  return <p role="alert" className="p-6 text-sm">No tienes permiso para consultar auditoría.</p>
}
