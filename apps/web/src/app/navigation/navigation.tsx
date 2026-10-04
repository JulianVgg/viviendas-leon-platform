import type { ReactNode } from 'react'
import { AppIcon } from '@/components/icons'
import type { UserRole } from '@/types/roles'

export type NavigationItem = {
  id: string
  name: string
  path: string
  icon: ReactNode
  roles?: UserRole[]
  children?: NavigationItem[]
}

export const navigationGroups: { id: string; name: string; items: NavigationItem[] }[] = [
  {
    id: 'main',
    name: 'Navegación',
    items: [
      { id: 'dashboard', name: 'Dashboard', path: '/', icon: <AppIcon label="D" />, roles: ['fieldWorker', 'coordination', 'operationsDirector', 'administration', 'audit'] },
      { id: 'families', name: 'Familias y beneficiarios', path: '/familias', icon: <AppIcon label="F" />, roles: ['fieldWorker', 'coordination'] },
      { id: 'agriculture', name: 'Gestión agrícola', path: '/gestion-agricola', icon: <AppIcon label="A" />, roles: ['fieldWorker', 'coordination'], children: [
        { id: 'gardens', name: 'Huertos', path: '/gestion-agricola/huertos', icon: <AppIcon label="H" /> },
        { id: 'crops', name: 'Cultivos', path: '/gestion-agricola/cultivos', icon: <AppIcon label="C" /> },
        { id: 'production', name: 'Producción', path: '/gestion-agricola/produccion', icon: <AppIcon label="P" /> },
        { id: 'phytosanitary', name: 'Control fitosanitario', path: '/gestion-agricola/control-fitosanitario', icon: <AppIcon label="C" /> },
        { id: 'supplies', name: 'Insumos', path: '/gestion-agricola/insumos', icon: <AppIcon label="I" /> },
      ] },
      { id: 'activities', name: 'Actividades de campo', path: '/actividades', icon: <AppIcon label="V" />, roles: ['fieldWorker', 'coordination'], children: [
        { id: 'visits', name: 'Visitas', path: '/actividades/visitas', icon: <AppIcon label="V" /> },
        { id: 'technical-assistance', name: 'Asistencia técnica', path: '/actividades/asistencia-tecnica', icon: <AppIcon label="T" /> },
        { id: 'training', name: 'Capacitaciones', path: '/actividades/capacitaciones', icon: <AppIcon label="K" /> },
      ] },
      { id: 'volunteering', name: 'Voluntariado', path: '/voluntariado', icon: <AppIcon label="O" />, roles: ['coordination'] },
    ],
  },
  {
    id: 'management',
    name: 'Gestión',
    items: [
      { id: 'reports', name: 'Reportes', path: '/reportes', icon: <AppIcon label="R" />, roles: ['coordination', 'operationsDirector'], children: [
        { id: 'reports-list', name: 'Reportes', path: '/reportes/reportes', icon: <AppIcon label="R" /> },
        { id: 'indicators', name: 'Indicadores', path: '/reportes/indicadores', icon: <AppIcon label="I" /> },
        { id: 'alerts', name: 'Alertas', path: '/reportes/alertas', icon: <AppIcon label="!" /> },
      ] },
      { id: 'admin', name: 'Administración', path: '/administracion', icon: <AppIcon label="G" />, roles: ['administration'], children: [
        { id: 'users', name: 'Usuarios', path: '/administracion/usuarios', icon: <AppIcon label="U" /> },
        { id: 'roles', name: 'Roles y permisos', path: '/administracion/roles-permisos', icon: <AppIcon label="P" /> },
        { id: 'settings', name: 'Configuración', path: '/administracion/configuracion', icon: <AppIcon label="C" /> },
      ] },
      { id: 'audit', name: 'Auditoría', path: '/auditoria', icon: <AppIcon label="B" />, roles: ['audit'], children: [
        { id: 'audit-log', name: 'Bitácora', path: '/auditoria/bitacora', icon: <AppIcon label="B" /> },
      ] },
    ],
  },
]

export function navigationForRole(role: UserRole) {
  return navigationGroups.map((group) => ({ ...group, items: group.items.filter((item) => item.roles?.includes(role)) })).filter((group) => group.items.length > 0)
}
