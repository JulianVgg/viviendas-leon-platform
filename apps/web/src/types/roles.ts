export type UserRole =
  | 'fieldWorker'
  | 'coordination'
  | 'operationsDirector'
  | 'administration'
  | 'audit'

export const roleOptions = [
  { id: 'fieldWorker', label: 'Trabajador de campo' },
  { id: 'coordination', label: 'Coordinación' },
  { id: 'operationsDirector', label: 'Dirección operativa' },
  { id: 'administration', label: 'Administración' },
  { id: 'audit', label: 'Auditoría' },
] satisfies { id: UserRole; label: string }[]
