import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

type SidebarContextValue = {
  isExpanded: boolean
  isMobileOpen: boolean
  isHovered: boolean
  setIsHovered: (value: boolean) => void
  toggleSidebar: () => void
  toggleMobileSidebar: () => void
  closeMobileSidebar: () => void
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const closeMobileSidebar = useCallback(() => setIsMobileOpen(false), [])

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)')
    const handleChange = () => {
      if (media.matches) closeMobileSidebar()
      setIsHovered(false)
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [closeMobileSidebar])
  return (
    <SidebarContext.Provider value={{
      isExpanded,
      isMobileOpen,
      isHovered,
      setIsHovered,
      toggleSidebar: () => { setIsExpanded((value) => !value); setIsHovered(false) },
      toggleMobileSidebar: () => setIsMobileOpen((value) => !value),
      closeMobileSidebar,
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
