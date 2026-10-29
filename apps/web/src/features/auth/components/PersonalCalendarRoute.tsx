import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../AuthProvider'
import { esSupervisorCalendario } from '../calendarAccess'

export default function PersonalCalendarRoute() {
  const { usuario } = useAuth()
  if (usuario && esSupervisorCalendario(usuario)) return <Navigate to="/calendario" replace />
  return <Outlet />
}
