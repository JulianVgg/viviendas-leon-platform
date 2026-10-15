import { useSidebar } from '@/app/providers/SidebarContext'

export default function Backdrop() {
  const { isMobileOpen, closeMobileSidebar } = useSidebar()

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label="Cerrar navegación"
      aria-hidden={!isMobileOpen}
      inert={!isMobileOpen}
      onClick={closeMobileSidebar}
      className={`fixed inset-0 z-40 bg-gray-950/50 backdrop-blur-[2px] transition-[opacity,visibility] duration-300 ease-in-out motion-reduce:transition-none xl:hidden ${
        isMobileOpen ? 'visible opacity-100' : 'invisible pointer-events-none opacity-0'
      }`}
    />
  )
}
