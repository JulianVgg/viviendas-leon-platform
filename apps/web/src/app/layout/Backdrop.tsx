import { useSidebar } from '@/app/providers/SidebarContext'

export default function Backdrop() {
  const { isMobileOpen, closeMobileSidebar } = useSidebar()
  return isMobileOpen ? <button type="button" aria-label="Cerrar navegación" onClick={closeMobileSidebar} className="fixed inset-0 z-40 bg-slate-950/50 xl:hidden" /> : null
}
