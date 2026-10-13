import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useRole } from '@/app/providers/RoleContext'
import { useSidebar } from '@/app/providers/SidebarContext'
import { useTheme } from '@/app/providers/ThemeContext'
import NotificationDropdown from '@/components/header/NotificationDropdown'
import Button from '@/components/ui/Button'
import { formControlClassName } from '@/components/ui/FormField'
import SyncStatus from '@/components/ui/SyncStatus'
import { useConnectivityStatus } from '@/hooks/useConnectivityStatus'
import { navigationForRole } from '@/app/navigation/navigation'

export default function AppHeader() {
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar()
  const { theme, toggleTheme } = useTheme()
  const { currentRole, availableRoles, setRole } = useRole()
  const [userOpen, setUserOpen] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)
  const roleButtonRef = useRef<HTMLButtonElement>(null)
  const connectivity = useConnectivityStatus()
  const toggleMenu = () => window.innerWidth >= 1280 ? toggleSidebar() : toggleMobileSidebar()
  const canViewSettings = navigationForRole(currentRole.id).some((group) => group.items.some((item) => item.children?.some((child) => child.path === '/administracion/configuracion')))

  useEffect(() => {
    if (!userOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !userRef.current?.contains(event.target)) setUserOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserOpen(false)
        roleButtonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [userOpen])

  return <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
    <div className="flex min-h-20 items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button id="sidebar-toggle" type="button" className="layout-icon-button layout-focus rounded-lg" aria-controls="app-sidebar" onClick={toggleMenu}>
          <span className="sr-only xl:hidden">{isMobileOpen ? 'Cerrar navegación' : 'Abrir navegación'}</span><span className="sr-only hidden xl:inline">{isExpanded ? 'Colapsar navegación' : 'Expandir navegación'}</span>
          <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 6h16M4 12h10M4 18h16" /></svg>
        </button>
        <Link to="/" className="layout-focus hidden min-w-0 rounded-lg sm:block"><span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">ViviendasLeón Guatemala</span><span className="block text-xs text-slate-500 dark:text-slate-400">Plataforma de gestión</span></Link>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button type="button" className="layout-icon-button layout-focus" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'}>
          <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{theme === 'dark' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> : <path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z" />}</svg>
        </button>
        <NotificationDropdown />
        <div ref={userRef} className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setUserOpen(false) }}>
          <button ref={roleButtonRef} type="button" className="layout-focus flex min-h-11 max-w-56 items-center gap-2 rounded-lg px-1 text-start hover:bg-slate-100 dark:hover:bg-white/5" onClick={() => setUserOpen((value) => !value)} aria-label={`Seleccionar rol simulado: ${currentRole.label}`} aria-controls="mock-role-panel" aria-expanded={userOpen}>
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">VL</span>
            <span className="hidden min-w-0 md:block"><span className="block truncate text-sm font-medium text-slate-800 dark:text-white">Usuario mock</span><span className="block truncate text-xs text-slate-500 dark:text-slate-400">{currentRole.label}</span></span>
            <span aria-hidden="true" className="hidden text-slate-500 sm:block">{userOpen ? '⌃' : '⌄'}</span>
          </button>
          {userOpen && <div id="mock-role-panel" className="absolute end-0 z-10 mt-3 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-theme-lg dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-800 dark:text-white">Rol simulado</p><p id="mock-role-help" className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Cambia la visibilidad de la interfaz. No representa autenticación ni permisos del backend.</p>
            <label htmlFor="mock-role" className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">Vista por rol</label>
            <select id="mock-role" aria-describedby="mock-role-help" value={currentRole.id} className={formControlClassName + ' mt-2'} onChange={(event) => setRole(event.target.value as typeof currentRole.id)}>{availableRoles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}</select>
            {canViewSettings && <Link to="/administracion/configuracion" onClick={() => setUserOpen(false)} className="layout-menu-item layout-menu-inactive layout-focus mt-3">Configuración de cuenta</Link>}
            <Button type="button" variant="ghost" size="sm" className="mt-3 w-full" onClick={() => { setUserOpen(false); roleButtonRef.current?.focus() }}>Cerrar</Button>
          </div>}
        </div>
      </div>
    </div><div className="border-t border-slate-100 px-3 py-2 sm:px-6 dark:border-slate-800"><SyncStatus state={connectivity.status} /></div>
    {connectivity.status === 'offline' && (
      <p role="status" className="px-4 pb-2 text-xs text-slate-600 dark:text-slate-300">
        Sin conexión. Las operaciones guardadas localmente permanecen disponibles.
      </p>
    )}
    {connectivity.status === 'server-unavailable' && (
      <p role="status" className="px-4 pb-2 text-xs text-amber-700 dark:text-amber-300">
        La API no responde. Los registros locales no se enviarán automáticamente.
      </p>
    )}
    {connectivity.status === 'connected' && connectivity.recoveredAt && (
      <p role="status" className="px-4 pb-2 text-xs text-emerald-700 dark:text-emerald-300">
        Conexión recuperada. La cola puede revisarse; la sincronización real aún no está habilitada.
      </p>
    )}
  </header>
}
