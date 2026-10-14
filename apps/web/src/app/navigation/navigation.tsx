import type { ReactNode } from 'react'
import { AppIcon, NavigationIcon } from '@/components/icons'
import type { UserRole } from '@/types/roles'

export type NavigationItem = {
  id: string
  name: string
  path?: string
  icon?: ReactNode
  exact?: boolean
  sidebarHidden?: boolean
  roles?: UserRole[]
  children?: NavigationItem[]
}

export const navigationGroups: { id: string; name: string; items: NavigationItem[] }[] = [
  {
    id: 'main',
    name: '',
    items: [
      { id: 'dashboard', name: 'Panel principal', path: '/', icon: <NavigationIcon name="dashboard" />, roles: ['fieldWorker', 'coordination', 'operationsDirector', 'administration', 'audit'] },
      { id: 'families', name: 'Familias', icon: <NavigationIcon name="users" />, roles: ['fieldWorker', 'coordination'], children: [
        { id: 'families-list', name: 'Listado de familias', path: '/familias', exact: true },
        { id: 'families-create', name: 'Registrar familia', path: '/familias/nueva' },
      ] },
      { id: 'agriculture', name: 'Gestión agrícola', icon: <NavigationIcon name="sprout" />, roles: ['fieldWorker', 'coordination'], children: [
        { id: 'gardens', name: 'Huertos y cultivos', path: '/gestion-agricola', exact: true },
        { id: 'production', name: 'Producción y cosechas', path: '/gestion-agricola/produccion' },
        { id: 'costs-sales', name: 'Costos y ventas', roles: ['coordination'] },
      ] },
      { id: 'training', name: 'Capacitaciones', icon: <NavigationIcon name="graduation-cap" />, roles: ['fieldWorker', 'coordination'], children: [
        { id: 'training-schedule', name: 'Programación', path: '/actividades/capacitaciones' },
        { id: 'training-attendance', name: 'Participantes y asistencia' },
      ] },
      { id: 'inventory', name: 'Insumos e inventario', icon: <NavigationIcon name="package" />, roles: ['fieldWorker', 'coordination'], children: [
        { id: 'supplies', name: 'Inventario', path: '/gestion-agricola/insumos' },
        { id: 'inventory-movements', name: 'Movimientos' },
      ] },
      { id: 'reports', name: 'Seguimiento y reportes', icon: <NavigationIcon name="chart" />, roles: ['fieldWorker', 'coordination', 'operationsDirector'], children: [
        { id: 'families-follow-up', name: 'Seguimiento de familias', roles: ['fieldWorker', 'coordination'] },
        { id: 'indicators', name: 'Indicadores', path: '/reportes/indicadores', roles: ['coordination', 'operationsDirector'] },
        { id: 'reports-list', name: 'Reportes', path: '/reportes/reportes', roles: ['coordination', 'operationsDirector'] },
      ] },
    ],
  },
  {
    id: 'management',
    name: 'Gestión',
    items: [
      // Preserve the module configuration and header permissions; exclude only sidebar visibility.
      { id: 'admin', name: 'Administración', path: '/administracion', sidebarHidden: true, icon: <AppIcon label="G" />, roles: ['administration'], children: [
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
  function filterItems(items: NavigationItem[], inheritedAccess = false): NavigationItem[] {
    return items.filter((item) => item.roles ? item.roles.includes(role) : inheritedAccess).map((item) => ({
      ...item,
      ...(item.children ? { children: filterItems(item.children, true) } : {}),
    })).filter((item) => !item.children || item.children.length > 0)
  }
  return navigationGroups.map((group) => ({ ...group, items: filterItems(group.items) })).filter((group) => group.items.length > 0)
}
