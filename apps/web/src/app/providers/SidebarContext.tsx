import { createContext, useContext, useState, type ReactNode } from 'react'

type SidebarContextValue = {
  isExpanded: boolean
  isMobileOpen: boolean
  toggleSidebar: () => void
  toggleMobileSidebar: () => void
  closeMobileSidebar: () => void
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  return (
    <SidebarContext.Provider value={{
      isExpanded,
      isMobileOpen,
      toggleSidebar: () => setIsExpanded((value) => !value),
      toggleMobileSidebar: () => setIsMobileOpen((value) => !value),
      closeMobileSidebar: () => setIsMobileOpen(false),
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components
export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) throw new Error('useSidebar must be used within SidebarProvider')
  return context
}
