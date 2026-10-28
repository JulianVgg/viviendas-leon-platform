import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../AuthProvider'
import { esSupervisorCalendario } from '../calendarAccess'

export default function SupervisorCalendarRoute() {
  const { usuario } = useAuth()
  return usuario && esSupervisorCalendario(usuario) ? <Outlet /> : <Navigate to="/" replace />
}
