
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useSidebar } from '@/app/providers/SidebarContext'
import { useTheme } from '@/app/providers/ThemeContext'
import { useAuth } from '@/features/auth/AuthProvider'
import NotificationDropdown from '@/components/header/NotificationDropdown'
import Button from '@/components/ui/Button'
import SyncStatus from '@/components/ui/SyncStatus'
import { useConnectivityStatus } from '@/hooks/useConnectivityStatus'
import { canViewPath } from '@/features/auth/screenPermissions'

export default function AppHeader() {
  const navigate = useNavigate()
  const { usuario, cerrarSesion } = useAuth()
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar()
  const { theme, toggleTheme } = useTheme()
  const [userOpen, setUserOpen] = useState(false)
  const [cerrandoSesion, setCerrandoSesion] = useState(false)
  const [errorLogout, setErrorLogout] = useState('')
  const userRef = useRef<HTMLDivElement>(null)
  const roleButtonRef = useRef<HTMLButtonElement>(null)
  const connectivity = useConnectivityStatus()
  const toggleMenu = () => window.innerWidth >= 1280 ? toggleSidebar() : toggleMobileSidebar()
  const canViewSettings = Boolean(usuario && canViewPath(usuario, '/administracion/configuracion'))

  async function handleLogout() {
    if (cerrandoSesion) return
    setErrorLogout('')
    setCerrandoSesion(true)
    try {
      await cerrarSesion()
      setUserOpen(false)
      navigate('/login', { replace: true })
    } catch {
      setErrorLogout('No fue posible cerrar la sesión. Intenta nuevamente.')
    } finally {
      setCerrandoSesion(false)
    }
  }

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
          <button ref={roleButtonRef} type="button" className="layout-focus flex min-h-11 max-w-56 items-center gap-2 rounded-lg px-1 text-start hover:bg-slate-100 dark:hover:bg-white/5" onClick={() => setUserOpen((value) => !value)} aria-label="Abrir menú de usuario" aria-controls="user-account-panel" aria-expanded={userOpen}>
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">VL</span>
            <span className="hidden min-w-0 md:block"><span className="block truncate text-sm font-medium text-slate-800 dark:text-white">{usuario?.nombre ?? 'Usuario'}</span><span className="block truncate text-xs text-slate-500 dark:text-slate-400">{usuario?.roles.join(', ') || 'Sin rol asignado'}</span></span>
            <span aria-hidden="true" className="hidden text-slate-500 sm:block">{userOpen ? '⌃' : '⌄'}</span>
          </button>
          {userOpen && <div id="user-account-panel" className="absolute end-0 z-10 mt-3 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-theme-lg dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-800 dark:text-white">{usuario?.nombre ?? 'Usuario'}</p>
            <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">{usuario?.correo}</p>
            <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">{usuario?.roles.join(', ') || 'Sin rol asignado'}</p>
            <Link to="/mi-perfil" onClick={() => setUserOpen(false)} className="layout-menu-item layout-menu-inactive layout-focus mt-3">Mi perfil</Link>
            {canViewSettings && <Link to="/administracion/configuracion" onClick={() => setUserOpen(false)} className="layout-menu-item layout-menu-inactive layout-focus mt-3">Configuración de cuenta</Link>}
            <Button type="button" variant="ghost" size="sm" className="mt-3 w-full" onClick={() => { setUserOpen(false); roleButtonRef.current?.focus() }}>Cerrar menú</Button>
            <button type="button" disabled={cerrandoSesion} onClick={() => void handleLogout()} className="mt-3 w-full rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:hover:bg-red-950/30">
              {cerrandoSesion ? 'Cerrando sesión...' : 'Cerrar sesión'}
            </button>
            {errorLogout && <p role="alert" className="mt-2 text-xs text-red-600">{errorLogout}</p>}
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
