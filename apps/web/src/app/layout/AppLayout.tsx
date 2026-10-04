import { Outlet } from 'react-router'
import { SidebarProvider, useSidebar } from '@/app/providers/SidebarContext'
import AppHeader from './AppHeader'
import AppSidebar from './AppSidebar'
import Backdrop from './Backdrop'

function LayoutContent() {
  const { isExpanded } = useSidebar()
  return <div className="min-h-screen overflow-x-clip bg-slate-50 dark:bg-slate-950 xl:flex"><AppSidebar /><Backdrop /><div className={`min-w-0 flex-1 transition-[margin] duration-300 ${isExpanded ? 'xl:ms-72' : 'xl:ms-20'}`}><AppHeader /><main className="mx-auto w-full max-w-screen-2xl p-4 sm:p-6"><Outlet /></main></div></div>
}

export default function AppLayout() { return <SidebarProvider><LayoutContent /></SidebarProvider> }
