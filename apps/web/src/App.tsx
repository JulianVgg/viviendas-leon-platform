import { BrowserRouter } from 'react-router'
import { RoleProvider } from '@/app/providers/RoleContext'
import { ThemeProvider } from '@/app/providers/ThemeContext'
import AppRoutes from '@/app/routes'

export default function App() {
  return <BrowserRouter><ThemeProvider><RoleProvider><AppRoutes /></RoleProvider></ThemeProvider></BrowserRouter>
}
