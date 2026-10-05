import { useState } from 'react'
import { Link } from 'react-router'
import { useRole } from '@/app/providers/RoleContext'
import { useSidebar } from '@/app/providers/SidebarContext'
import { useTheme } from '@/app/providers/ThemeContext'
import NotificationDropdown from '@/components/header/NotificationDropdown'

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950'

export default function AppHeader() {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar()
  const { theme, toggleTheme } = useTheme()
  const { currentRole, availableRoles, setRole } = useRole()
  const [userOpen, setUserOpen] = useState(false)
  const toggleMenu = () => window.innerWidth >= 1280 ? toggleSidebar() : toggleMobileSidebar()

  return <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
    <div className="flex min-h-16 min-w-0 items-center justify-between gap-2 px-2 sm:gap-3 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button type="button" aria-label="Abrir navegación" onClick={toggleMenu} className={`shrink-0 rounded-lg border border-slate-200 px-2.5 py-2 text-slate-600 dark:border-slate-700 dark:text-slate-300 ${focusRing}`}>{isMobileOpen ? '×' : '☰'}</button>
        <Link to="/" className={`hidden truncate font-semibold text-slate-900 dark:text-white sm:block xl:hidden ${focusRing}`}>Viviendas León</Link>
        <div className="hidden xl:block"><input readOnly placeholder="Buscar" className={`h-10 w-72 rounded-lg border border-slate-200 bg-transparent px-3 text-sm outline-none dark:border-slate-700 ${focusRing}`} /></div>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button type="button" onClick={toggleTheme} aria-label="Cambiar tema" className={`rounded-lg border border-slate-200 px-2 py-2 text-xs dark:border-slate-700 sm:px-3 sm:text-sm ${focusRing}`}>{theme === 'dark' ? 'Claro' : 'Oscuro'}</button>
        <NotificationDropdown />
        <div className="relative">
          <button type="button" onClick={() => setUserOpen((value) => !value)} aria-expanded={userOpen} className={`flex max-w-52 items-center gap-2 rounded-lg px-1.5 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 sm:px-2 ${focusRing}`}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">U</span>
            <span className="hidden min-w-0 sm:block"><span className="block truncate text-sm font-medium text-slate-800 dark:text-white">Usuario</span><span className="block truncate text-xs text-slate-500 dark:text-slate-400">{currentRole.label}</span></span>
          </button>
          {userOpen && <div className="absolute end-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-900 dark:text-white">Usuario mock</p>
            <p className="mt-1 text-xs text-slate-500">{currentRole.label}</p>
            <select aria-label="Rol mock" value={currentRole.id} className={`mt-4 h-10 w-full rounded-lg border border-slate-300 bg-transparent px-2 text-sm dark:border-slate-700 ${focusRing}`} onChange={(event) => setRole(event.target.value as typeof currentRole.id)}>{availableRoles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}</select>
            <Link to="/administracion/configuracion" onClick={() => setUserOpen(false)} className={`mt-3 block rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${focusRing}`}>Configuración de cuenta</Link>
          </div>}
        </div>
      </div>
    </div>
  </header>
}
