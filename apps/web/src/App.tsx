
import { BrowserRouter } from 'react-router'
import { ThemeProvider } from '@/app/providers/ThemeContext'
import { AuthProvider } from '@/features/auth/AuthProvider'
import AppRoutes from '@/app/routes'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
