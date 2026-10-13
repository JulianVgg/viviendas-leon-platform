import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useRole } from '@/app/providers/RoleContext'
import { useSidebar } from '@/app/providers/SidebarContext'
import { navigationForRole, type NavigationItem } from '@/app/navigation/navigation'
import { cn } from '@/app/lib/cn'

function activePath(pathname: string, path: string) {
  return path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`)
}

export default function AppSidebar() {
  const { currentRole } = useRole()
  const { isExpanded, isHovered, setIsHovered, isMobileOpen, closeMobileSidebar } = useSidebar()
  const { pathname } = useLocation()
  const groups = useMemo(() => navigationForRole(currentRole.id), [currentRole.id])
  const sidebarRef = useRef<HTMLElement>(null)
  const [submenu, setSubmenu] = useState<{ route: string; role: string; id: string | null } | null>(null)
  const activeParentId = groups.flatMap((group) => group.items).find((item) => item.children && activePath(pathname, item.path))?.id
  const open = submenu?.route === pathname && submenu.role === currentRole.id ? submenu.id : activeParentId
  const showLabels = isExpanded || isHovered || isMobileOpen

  useEffect(() => {
    if (!isMobileOpen) return
    const sidebar = sidebarRef.current
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sidebar?.querySelector<HTMLElement>('button')?.focus()

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
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [isMobileOpen, closeMobileSidebar])

  function renderItems(items: NavigationItem[]) {
    return <ul className="space-y-1">
      {items.map((item) => {
        const active = activePath(pathname, item.path)
        const expanded = open === item.id
        const menuClass = cn('layout-menu-item layout-focus', active || expanded ? 'layout-menu-active' : 'layout-menu-inactive', !showLabels && 'xl:justify-center')
        return <li key={item.id}>
          {item.children ? <>
            <button type="button" aria-label={item.name} aria-expanded={expanded && showLabels} aria-controls={`submenu-${item.id}`} title={!showLabels ? item.name : undefined} onClick={() => setSubmenu({ route: pathname, role: currentRole.id, id: expanded ? null : item.id })} className={menuClass}>
              <span aria-hidden="true" className="shrink-0">{item.icon}</span><span className={cn('min-w-0 flex-1', !showLabels && 'xl:hidden')}>{item.name}</span><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={cn('size-4 shrink-0 transition-transform motion-reduce:transition-none', expanded && 'rotate-180', !showLabels && 'xl:hidden')}><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <ul id={`submenu-${item.id}`} hidden={!expanded || !showLabels} className="ms-6 mt-2 space-y-1 border-s border-slate-200 ps-3 dark:border-slate-800">
              <li><Link to={item.path} onClick={closeMobileSidebar} aria-current={pathname === item.path ? 'page' : undefined} className={cn('layout-menu-item layout-focus', pathname === item.path ? 'layout-menu-active' : 'layout-menu-inactive')}>Vista general</Link></li>
              {item.children.map((child) => <li key={child.id}><Link onClick={closeMobileSidebar} to={child.path} aria-current={activePath(pathname, child.path) ? 'page' : undefined} className={cn('layout-menu-item layout-focus', activePath(pathname, child.path) ? 'layout-menu-active' : 'layout-menu-inactive')}><span>{child.name}</span></Link></li>)}
            </ul>
          </> : <Link onClick={closeMobileSidebar} to={item.path} aria-label={item.name} aria-current={active ? 'page' : undefined} title={!showLabels ? item.name : undefined} className={menuClass}><span aria-hidden="true" className="shrink-0">{item.icon}</span><span className={cn(!showLabels && 'xl:hidden')}>{item.name}</span></Link>}
        </li>
      })}
    </ul>
  }

  return <aside ref={sidebarRef} id="app-sidebar" aria-label="Navegación de ViviendasLeón Guatemala" className={cn('fixed inset-y-0 start-0 z-50 flex w-72.5 max-w-[calc(100vw-1rem)] flex-col border-e border-slate-200 bg-white px-5 py-6 transition-[width,translate,visibility] duration-300 ease-in-out motion-reduce:transition-none dark:border-slate-800 dark:bg-slate-900', isMobileOpen ? 'visible translate-x-0' : 'invisible -translate-x-full xl:visible xl:translate-x-0', showLabels ? 'xl:w-72.5' : 'xl:w-22.5')}
    onMouseEnter={() => { if (!isExpanded && window.matchMedia('(min-width: 1280px)').matches) setIsHovered(true) }}
    onMouseLeave={() => { if (!sidebarRef.current?.contains(document.activeElement)) setIsHovered(false) }}
    onFocus={() => { if (!isExpanded && window.matchMedia('(min-width: 1280px)').matches) setIsHovered(true) }}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && !event.currentTarget.matches(':hover')) setIsHovered(false) }}>
    <div className="mb-8 flex items-center justify-between gap-2">
      <Link to="/" aria-label="ViviendasLeón Guatemala — Inicio" onClick={closeMobileSidebar} className={cn('layout-focus flex min-w-0 items-center gap-3 rounded-lg text-slate-900 dark:text-white', !showLabels && 'xl:mx-auto')}>
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white shadow-theme-xs">VL</span><span className={cn(!showLabels && 'xl:hidden')}><span className="block text-base font-semibold tracking-tight">ViviendasLeón</span><span className="block text-xs text-slate-500 dark:text-slate-400">Guatemala</span></span>
      </Link>
      <button type="button" onClick={closeMobileSidebar} aria-label="Cerrar navegación" className="layout-icon-button layout-focus size-9 xl:hidden"><span aria-hidden="true">×</span></button>
    </div>
    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-1 -mx-1"><nav aria-label="Navegación principal" className="space-y-7">{groups.map((group) => <section key={group.id}><h2 className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"><span className={cn(!showLabels && 'xl:sr-only')}>{group.name}</span>{!showLabels && <span aria-hidden="true" className="hidden text-center xl:block">···</span>}</h2>{renderItems(group.items)}</section>)}</nav></div>
    <div className={cn('mt-5 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400', !showLabels && 'xl:hidden')}><p className="font-medium text-slate-700 dark:text-slate-300">{currentRole.label}</p><p className="mt-1">Rol simulado · Vista de interfaz</p></div>
  </aside>
}
