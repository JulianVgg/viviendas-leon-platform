import { createContext, useContext, useState, type ReactNode } from 'react'
import { roleOptions, type UserRole } from '@/types/roles'

type RoleContextValue = {
  currentRole: (typeof roleOptions)[number]
  availableRoles: typeof roleOptions
  setRole: (role: UserRole) => void
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined)

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('fieldWorker')
  const currentRole = roleOptions.find((item) => item.id === role) ?? roleOptions[0]

  return (
    <RoleContext.Provider value={{ currentRole, availableRoles: roleOptions, setRole }}>
      {children}
    </RoleContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components
export function useRole() {
  const context = useContext(RoleContext)
  if (!context) throw new Error('useRole must be used within RoleProvider')
  return context
}
