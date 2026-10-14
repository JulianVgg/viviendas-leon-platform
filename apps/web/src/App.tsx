
import { BrowserRouter } from 'react-router'
import { RoleProvider } from '@/app/providers/RoleContext'
import { ThemeProvider } from '@/app/providers/ThemeContext'
import { AuthProvider } from '@/features/auth/AuthProvider'
import AppRoutes from '@/app/routes'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <RoleProvider>
            <AppRoutes />
          </RoleProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
