import ConnectivitySyncBridge from './ConnectivitySyncBridge'
import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { cn } from '@/app/lib/cn'
import { SidebarProvider, useSidebar } from '@/app/providers/SidebarContext'
import AppHeader from './AppHeader'
import AppSidebar from './AppSidebar'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath } from '@/features/auth/screenPermissions'
import Backdrop from './Backdrop'

function LayoutContent() {
  const { isExpanded, isHovered, isMobileOpen, closeMobileSidebar } = useSidebar()
  const { pathname } = useLocation()
  const { usuario } = useAuth()

  useEffect(() => {
    closeMobileSidebar()
  }, [pathname, closeMobileSidebar])

  return (
    <div className="min-h-dvh bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300 xl:flex">
      <a href="#main-content" className="layout-focus fixed start-4 top-4 z-60 -translate-y-24 rounded-lg bg-white px-4 py-3 text-sm font-medium text-brand-600 shadow-theme-lg focus:translate-y-0 dark:bg-gray-900 dark:text-brand-300">
        Saltar al contenido
      </a>
      <AppSidebar />
      <Backdrop />
      <div inert={isMobileOpen} className={cn('min-w-0 flex-1 transition-[margin] duration-300 ease-in-out motion-reduce:transition-none', isExpanded || isHovered ? 'xl:ms-72.5' : 'xl:ms-22.5')}>
        <AppHeader />
        <ConnectivitySyncBridge />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-screen-2xl p-4 outline-none md:p-6 xl:p-8">
          <div key={pathname} className="page-route-enter">
            {usuario && !canViewPath(usuario, pathname) ? (
              <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <h1 className="text-lg font-semibold">Acceso restringido</h1>
                <p className="mt-2 text-sm">Tu rol no tiene acceso a esta pantalla. Consulta con Dirección general si necesitas ese permiso.</p>
              </div>
            ) : <Outlet />}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AppLayout() {
  return <SidebarProvider><LayoutContent /></SidebarProvider>
}
