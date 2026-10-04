import { useState } from 'react'
import { Link } from 'react-router'
import { useRole } from '@/app/providers/RoleContext'
import { useSidebar } from '@/app/providers/SidebarContext'
import { useTheme } from '@/app/providers/ThemeContext'
import NotificationDropdown from '@/components/header/NotificationDropdown'
import Button from '@/components/ui/Button'
import { formControlClassName } from '@/components/ui/FormField'
import SyncStatus from '@/components/ui/SyncStatus'

export default function AppHeader() {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar()
  const { theme, toggleTheme } = useTheme()
  const { currentRole, availableRoles, setRole } = useRole()
  const [userOpen, setUserOpen] = useState(false)
  const toggleMenu = () => window.innerWidth >= 1280 ? toggleSidebar() : toggleMobileSidebar()

  return <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
    <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3"><Button type="button" variant="secondary" size="sm" aria-label="Abrir navegación" onClick={toggleMenu}>{isMobileOpen ? '×' : '☰'}</Button><Link to="/" className="truncate font-semibold text-slate-900 dark:text-white xl:hidden">Viviendas León</Link><div className="hidden xl:block"><input readOnly placeholder="Buscar" className={formControlClassName + ' w-72'} /></div></div>
      <div className="flex items-center gap-2"><SyncStatus state="synced" /><Button type="button" variant="secondary" size="sm" onClick={toggleTheme} aria-label="Cambiar tema">{theme === 'dark' ? 'Claro' : 'Oscuro'}</Button><NotificationDropdown /><div className="relative"><Button type="button" variant="ghost" className="flex max-w-52 gap-2 px-2 py-1.5 text-left" onClick={() => setUserOpen((value) => !value)} aria-expanded={userOpen}><span className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">U</span><span className="hidden min-w-0 sm:block"><span className="block truncate text-sm font-medium text-slate-800 dark:text-white">Usuario</span><span className="block truncate text-xs text-slate-500 dark:text-slate-400">{currentRole.label}</span></span></Button>{userOpen && <div className="absolute end-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"><p className="text-sm font-medium text-slate-800 dark:text-white">Usuario mock</p><p className="mt-1 text-xs text-slate-500">{currentRole.label}</p><select aria-label="Rol mock" value={currentRole.id} className={formControlClassName + ' mt-4'} onChange={(event) => setRole(event.target.value as typeof currentRole.id)}>{availableRoles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}</select><Link to="/administracion/configuracion" onClick={() => setUserOpen(false)} className="mt-3 block rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">Configuración de cuenta</Link></div>}</div></div>
    </div>
  </header>
}
