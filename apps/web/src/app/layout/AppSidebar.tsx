import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '@/features/auth/AuthProvider'
import { useSidebar } from '@/app/providers/SidebarContext'
import { navigationForAccount, type NavigationItem } from '@/app/navigation/navigation'
import { canViewPath } from '@/features/auth/screenPermissions'
import { cn } from '@/app/lib/cn'

function activePath(pathname: string, path?: string, exact = false) {
  if (!path) return false
  if (path === '/familias/editar' && /^\/familias\/\d+\/editar$/.test(pathname)) return true
  return path === '/' || exact ? pathname === path : pathname === path || pathname.startsWith(`${path}/`)
}

export default function AppSidebar() {
  const { usuario } = useAuth()
  const sesion = usuario ?? { roles: [], permisos: [] }
  const menuKey = `${usuario?.id ?? 0}:${usuario?.roles.join(',') ?? ''}`
  const { isExpanded, isHovered, setIsHovered, isMobileOpen, closeMobileSidebar } = useSidebar()
  const { pathname } = useLocation()
  const groups = useMemo(
    () => navigationForAccount(sesion).map((group) => ({ ...group, items: group.items.filter((item) => !item.sidebarHidden) })).filter((group) => group.items.length > 0),
    // permisos deben actualizarse cuando cambia la sesión
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usuario?.id, usuario?.roles.join(','), usuario?.permisos.join(',')],
  )
  const sidebarRef = useRef<HTMLElement>(null)
  const [submenu, setSubmenu] = useState<{ route: string; role: string; expanded: Record<string, boolean> } | null>(null)
  // Match the most specific child so the inventory route does not open agriculture.
  const activeParentId = groups.flatMap((group) => group.items).flatMap((item) => item.children
    ? [item, ...item.children].filter((child) => activePath(pathname, child.path)).map((child) => ({ id: item.id, length: child.path?.length ?? 0 }))
    : []).sort((a, b) => b.length - a.length)[0]?.id
  const open = {
    ...(submenu?.role === menuKey ? submenu.expanded : {}),
    ...(activeParentId && (submenu?.route !== pathname || submenu.role !== menuKey) ? { [activeParentId]: true } : {}),
  }
  const showLabels = isExpanded || isHovered || isMobileOpen

  useEffect(() => {
    if (!isMobileOpen) return
    const sidebar = sidebarRef.current
    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousFocus = activeElement && activeElement !== document.body && !activeElement.closest('[inert]')
      ? activeElement
      : document.getElementById('sidebar-toggle')
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Wait for the visibility transition to enter its visible state before focusing.
    let focusFrame = window.requestAnimationFrame(() => {
      focusFrame = window.requestAnimationFrame(() => sidebar?.querySelector<HTMLElement>('button')?.focus())
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeMobileSidebar()
      }
      if (event.key !== 'Tab' || !sidebar) return
      const controls = Array.from(sidebar.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')).filter((element) => element.getClientRects().length > 0)
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus({ preventScroll: true })
    }
  }, [isMobileOpen, closeMobileSidebar])

  function renderItems(items: NavigationItem[]) {
    return <ul className="space-y-1">
      {items.map((item) => {
        const active = item.children ? activeParentId === item.id : activePath(pathname, item.path, item.exact)
        const expanded = open[item.id] ?? false
        const menuClass = cn('layout-menu-item layout-focus', active || expanded ? 'layout-menu-active' : 'layout-menu-inactive', !showLabels && 'xl:justify-center')
        return <li key={item.id}>
          {item.children ? <>
            <button type="button" aria-label={item.name} aria-expanded={expanded && showLabels} aria-controls={`submenu-${item.id}`} title={!showLabels ? item.name : undefined} onClick={() => setSubmenu({ route: pathname, role: menuKey, expanded: { ...open, [item.id]: !expanded } })} className={menuClass}>
              <span aria-hidden="true" className="shrink-0">{item.icon}</span><span className={cn('min-w-0 flex-1', !showLabels && 'xl:hidden')}>{item.name}</span><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={cn('size-4 shrink-0 transition-transform duration-300 motion-reduce:transition-none', expanded && 'rotate-180', !showLabels && 'xl:hidden')}><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className={cn('layout-menu-accordion', expanded && showLabels && 'is-open')} inert={!expanded || !showLabels} aria-hidden={!expanded || !showLabels}>
              <div>
                <ul id={`submenu-${item.id}`} className="ms-6 mt-2 space-y-1 border-s border-gray-200 ps-3 pb-1 dark:border-gray-800">
                  {item.path && item.id !== 'visits' && item.id !== 'families' && item.id !== 'admin' && canViewPath(sesion, item.path) && <li><Link to={item.path} onClick={closeMobileSidebar} aria-current={pathname === item.path ? 'page' : undefined} className={cn('layout-menu-item layout-focus', pathname === item.path ? 'layout-menu-active' : 'layout-menu-inactive')}>Vista general</Link></li>}              {item.children.map((child) => <li key={child.id}>{child.path
                ? <Link onClick={closeMobileSidebar} to={child.path} aria-current={activePath(pathname, child.path, child.exact) ? 'page' : undefined} className={cn('layout-menu-item layout-focus', activePath(pathname, child.path, child.exact) ? 'layout-menu-active' : 'layout-menu-inactive')}><span>{child.name}</span></Link>
                : <span aria-disabled="true" className="layout-menu-item flex-wrap text-gray-500 dark:text-gray-400"><span>{child.name}</span><span className="text-xs font-normal">En preparación</span></span>}</li>)}
                </ul>
              </div>
            </div>
          </> : item.path && <Link onClick={closeMobileSidebar} to={item.path} aria-label={item.name} aria-current={active ? 'page' : undefined} title={!showLabels ? item.name : undefined} className={menuClass}><span aria-hidden="true" className="shrink-0">{item.icon}</span><span className={cn(!showLabels && 'xl:hidden')}>{item.name}</span></Link>}
        </li>
      })}
    </ul>
  }

  return <aside ref={sidebarRef} id="app-sidebar" aria-label="Navegación de ViviendasLeón Guatemala" className={cn('fixed inset-y-0 start-0 z-50 flex w-72.5 max-w-[calc(100vw-1rem)] flex-col border-e border-gray-200 bg-white px-5 py-6 shadow-theme-xs transition-[width,translate,visibility] duration-300 ease-in-out motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900', isMobileOpen ? 'visible translate-x-0' : 'invisible -translate-x-full xl:visible xl:translate-x-0', showLabels ? 'xl:w-72.5' : 'xl:w-22.5')}
    onMouseEnter={() => { if (!isExpanded && window.matchMedia('(min-width: 1280px)').matches) setIsHovered(true) }}
    onMouseLeave={() => { if (!sidebarRef.current?.contains(document.activeElement)) setIsHovered(false) }}
    onFocus={() => { if (!isExpanded && window.matchMedia('(min-width: 1280px)').matches) setIsHovered(true) }}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && !event.currentTarget.matches(':hover')) setIsHovered(false) }}>
    <div className="mb-8 flex min-h-11 items-center justify-between gap-2">
      <Link to="/" aria-label="ViviendasLeón Guatemala — Inicio" onClick={closeMobileSidebar} className={cn('layout-focus flex min-w-0 items-center gap-3 rounded-lg text-gray-900 dark:text-white', !showLabels && 'xl:mx-auto')}>
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white shadow-theme-xs">VL</span><span className={cn(!showLabels && 'xl:hidden')}><span className="block text-base font-semibold tracking-tight">ViviendasLeón</span><span className="block text-xs text-gray-500 dark:text-gray-400">Guatemala</span></span>
      </Link>
      <button type="button" onClick={closeMobileSidebar} aria-label="Cerrar navegación" className="layout-icon-button layout-focus size-9 xl:hidden"><span aria-hidden="true">×</span></button>
    </div>
    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-1 -mx-1"><nav aria-label="Navegación principal" className="space-y-7">{groups.map((group) => <section key={group.id}>{group.name && <h2 className="mb-3 px-3 text-theme-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-400"><span className={cn(!showLabels && 'xl:sr-only')}>{group.name}</span>{!showLabels && <span aria-hidden="true" className="hidden text-center xl:block">···</span>}</h2>}{renderItems(group.items)}</section>)}</nav></div>
    <div className={cn('mt-5 border-t border-gray-200 pt-4 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400', !showLabels && 'xl:hidden')}><p className="font-medium text-gray-700 dark:text-gray-300">{usuario?.roles.join(', ') || 'Sin rol asignado'}</p><p className="mt-1">Rol real de la sesión</p></div>
  </aside>
}
