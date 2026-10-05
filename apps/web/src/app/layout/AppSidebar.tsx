import { useMemo, useState } from 'react'
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
  const { isExpanded, isMobileOpen, closeMobileSidebar } = useSidebar()
  const { pathname } = useLocation()
  const groups = useMemo(() => navigationForRole(currentRole.id), [currentRole.id])
  const [open, setOpen] = useState<string | null>(null)
  const activeParentId = groups.flatMap((group) => group.items).find((item) => item.children?.some((child) => activePath(pathname, child.path)))?.id

  function renderItems(items: NavigationItem[]) {
    return <ul className="space-y-1">
      {items.map((item) => {
        const active = activePath(pathname, item.path)
        const expanded = open === item.id || activeParentId === item.id
        return <li key={item.id}>
          {item.children ? <>
            <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : item.id)} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950', active || expanded ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')}>
              {item.icon}<span className={cn(!isExpanded && !isMobileOpen && 'xl:hidden')}>{item.name}</span><span className="ms-auto text-xs">{expanded ? '−' : '+'}</span>
            </button>
            {expanded && (isExpanded || isMobileOpen) && <ul className="ms-5 mt-1 space-y-1 border-s border-slate-200 ps-3 dark:border-slate-700">{item.children.map((child) => <li key={child.id}><Link onClick={closeMobileSidebar} to={child.path} className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950', activePath(pathname, child.path) ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800')}>{child.icon}<span>{child.name}</span></Link></li>)}</ul>}
          </> : <Link onClick={closeMobileSidebar} to={item.path} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950', active ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')}>{item.icon}<span className={cn(!isExpanded && !isMobileOpen && 'xl:hidden')}>{item.name}</span></Link>}
        </li>
      })}
    </ul>
  }

  return <aside style={isMobileOpen ? { insetInlineStart: 0 } : undefined} className={cn('fixed inset-y-0 z-50 flex w-72 flex-col border-e border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-950', isMobileOpen ? undefined : '!-start-full', 'xl:!start-0', isExpanded ? 'xl:w-72' : 'xl:w-20')}>
    <Link to="/" onClick={closeMobileSidebar} className={cn('mb-8 flex items-center gap-3 px-2 text-lg font-semibold text-slate-900 dark:text-white', !isExpanded && 'xl:justify-center')}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">VL</span><span className={cn(!isExpanded && !isMobileOpen && 'xl:hidden')}>Viviendas León</span>
    </Link>
    <div className="custom-scrollbar flex-1 overflow-y-auto"><nav aria-label="Navegación principal" className="space-y-6">{groups.map((group) => <section key={group.id}><h2 className={cn('mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400', !isExpanded && !isMobileOpen && 'xl:hidden')}>{group.name}</h2>{renderItems(group.items)}</section>)}</nav></div>
  </aside>
}
