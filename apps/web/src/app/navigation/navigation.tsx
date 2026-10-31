import type { ReactNode } from 'react'
import {
  Activity,
  Bell,
  Bug,
  CalendarDays,
  ContactRound,
  ChartNoAxesColumnIncreasing,
  ClipboardCheck,
  ClipboardPenLine,
  FileText,
  GraduationCap,
  History,
  HeartHandshake,
  MapPinned,
  House,
  LayoutDashboard,
  Leaf,
  Package,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sprout,
  UserRound,
  UsersRound,
  Wheat,
} from 'lucide-react'
import type { UserRole } from '@/types/roles'
import { canViewPath, type PermissionUser } from '@/features/auth/screenPermissions'
import { esTecnicoCampo } from '@/features/auth/calendarAccess'

export type NavigationItem = {
  id: string
  name: string
  path: string
  icon: ReactNode
  roles?: UserRole[]
  children?: NavigationItem[]
  sidebarHidden?: boolean
  exact?: boolean
}

// Alinea el tamaño y el trazo de los iconos del menú.
const size = 19
const strokeWidth = 1.8
const icons = {
  dashboard: <LayoutDashboard size={size} strokeWidth={strokeWidth} />,
  profile: <UserRound size={size} strokeWidth={strokeWidth} />,
  families: <UsersRound size={size} strokeWidth={strokeWidth} />,
  familyList: <FileText size={size} strokeWidth={strokeWidth} />,
  familyCreate: <ClipboardPenLine size={size} strokeWidth={strokeWidth} />,
  familyEdit: <ContactRound size={size} strokeWidth={strokeWidth} />,
  agriculture: <Sprout size={size} strokeWidth={strokeWidth} />,
  gardens: <House size={size} strokeWidth={strokeWidth} />,
  crops: <Leaf size={size} strokeWidth={strokeWidth} />,
  production: <Wheat size={size} strokeWidth={strokeWidth} />,
  phytosanitary: <Bug size={size} strokeWidth={strokeWidth} />,
  supplies: <Package size={size} strokeWidth={strokeWidth} />,
  visits: <ClipboardCheck size={size} strokeWidth={strokeWidth} />,
  agenda: <CalendarDays size={size} strokeWidth={strokeWidth} /> ,
  institutionalCalendar: <CalendarDays size={size} strokeWidth={strokeWidth} />,
  register: <ClipboardPenLine size={size} strokeWidth={strokeWidth} />,
  history: <History size={size} strokeWidth={strokeWidth} />,
  activities: <Activity size={size} strokeWidth={strokeWidth} />,
  training: <GraduationCap size={size} strokeWidth={strokeWidth} />,
  reports: <ChartNoAxesColumnIncreasing size={size} strokeWidth={strokeWidth} />,
  documents: <FileText size={size} strokeWidth={strokeWidth} />,
  alerts: <Bell size={size} strokeWidth={strokeWidth} />,
  admin: <Settings size={size} strokeWidth={strokeWidth} />,
  communities: <MapPinned size={size} strokeWidth={strokeWidth} />,
  programs: <HeartHandshake size={size} strokeWidth={strokeWidth} />,
  users: <UsersRound size={size} strokeWidth={strokeWidth} />,
  permissions: <SlidersHorizontal size={size} strokeWidth={strokeWidth} />,
  audit: <ShieldCheck size={size} strokeWidth={strokeWidth} />,
}

export const navigationGroups: { id: string; name: string; items: NavigationItem[] }[] = [
  {
    id: 'main',
    name: 'Navegación',
    items: [
      { id: 'dashboard', name: 'Dashboard', path: '/', icon: icons.dashboard, roles: ['fieldWorker', 'coordination', 'operationsDirector', 'administration', 'audit'] },
      { id: 'profile', name: 'Mi perfil', path: '/mi-perfil', icon: icons.profile, roles: ['fieldWorker', 'coordination', 'operationsDirector', 'administration', 'audit'] },
      { id: 'my-calendar', name: 'Mi calendario', path: '', icon: icons.agenda, children: [
        { id: 'calendar-personal', name: 'Calendario', path: '/visitas/agenda', icon: icons.agenda, exact: true },
        { id: 'calendar-institutional', name: 'Calendario', path: '/calendario', icon: icons.institutionalCalendar, exact: true },
        { id: 'my-agenda', name: 'Mi agenda', path: '/mi-agenda', icon: icons.history, exact: true },
      ] },
      { id: 'families', name: 'Familias y beneficiarios', path: '/familias', icon: icons.families, roles: ['fieldWorker', 'coordination'], children: [
        { id: 'families-list', name: 'Listado de familias', path: '/familias', icon: icons.familyList, exact: true },
        { id: 'families-create', name: 'Registrar familias', path: '/familias/nueva', icon: icons.familyCreate, exact: true },
        { id: 'families-edit', name: 'Editar familias', path: '/familias/editar', icon: icons.familyEdit, exact: true },
      ] },
      { id: 'agriculture', name: 'Gestión agrícola', path: '/gestion-agricola', icon: icons.agriculture, roles: ['fieldWorker', 'coordination'], children: [
        { id: 'gardens', name: 'Huertos', path: '/gestion-agricola/huertos', icon: icons.gardens },
        { id: 'cycles', name: 'Ciclos agrícolas', path: '/gestion-agricola/ciclos', icon: icons.crops },
        { id: 'production', name: 'Producción', path: '/gestion-agricola/produccion', icon: icons.production },
        { id: 'phytosanitary', name: 'Control fitosanitario', path: '/gestion-agricola/control-fitosanitario', icon: icons.phytosanitary },
        { id: 'supplies', name: 'Insumos', path: '/gestion-agricola/insumos', icon: icons.supplies },
      ] },
      { id: 'visits', name: 'Visitas técnicas', path: '/visitas', icon: icons.visits, roles: ['fieldWorker', 'coordination'], children: [
        { id: 'visits-new', name: 'Registrar visita', path: '/visitas/nueva', icon: icons.register },
        { id: 'visits-history', name: 'Historial de visitas', path: '/visitas/historial', icon: icons.history },
      ] },
      { id: 'activities', name: 'Actividades de campo', path: '/actividades', icon: icons.activities, roles: ['fieldWorker', 'coordination'], children: [
        { id: 'training-register', name: 'Registrar capacitación', path: '/actividades/capacitaciones/registrar', icon: icons.register },
        { id: 'training-history', name: 'Historial de capacitaciones', path: '/actividades/capacitaciones/historial', icon: icons.history },
      ] },
    ],
  },
  {
    id: 'management',
    name: 'Gestión',
    items: [
      { id: 'reports', name: 'Reportes', path: '/reportes', icon: icons.reports, roles: ['coordination', 'operationsDirector'], children: [
        { id: 'reports-list', name: 'Reportes', path: '/reportes/reportes', icon: icons.reports },
        { id: 'indicators', name: 'Indicadores', path: '/reportes/indicadores', icon: icons.reports },
        { id: 'alerts', name: 'Alertas', path: '/reportes/alertas', icon: icons.alerts },
      ] },
      { id: 'admin', name: 'Administración', path: '/administracion', icon: icons.admin, roles: ['administration', 'coordination'], children: [
        { id: 'communities', name: 'Comunidades', path: '/administracion/comunidades', icon: icons.communities },
        { id: 'municipalities', name: 'Municipios', path: '/administracion/municipios', icon: icons.communities },
        { id: 'programs', name: 'Programas', path: '/administracion/programas', icon: icons.programs },
        { id: 'catalog-crops', name: 'Catálogo de cultivos', path: '/administracion/cultivos', icon: icons.crops },
        { id: 'users', name: 'Usuarios', path: '/administracion/usuarios', icon: icons.users },
        { id: 'roles', name: 'Roles y permisos', path: '/administracion/roles-permisos', icon: icons.permissions },
      ] },
      { id: 'audit', name: 'Auditoría', path: '/auditoria', icon: icons.audit, roles: ['audit'], children: [
        { id: 'audit-log', name: 'Bitácora', path: '/auditoria/bitacora', icon: icons.history },
      ] },
    ],
  },
]

export function navigationForRole(role: UserRole) {
  return navigationGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.roles?.includes(role)) }))
    .filter((group) => group.items.length > 0)
}

export function navigationForAccount(usuario: PermissionUser) {
  return navigationGroups
    .map((grupo) => ({
      ...grupo,
      items: grupo.items.flatMap((item) => {
        if (item.id === 'my-calendar') {
          const calendario = esTecnicoCampo(usuario) ? 'calendar-personal' : 'calendar-institutional'
          const children = item.children!.filter(child =>
            (child.id === 'my-agenda' || child.id === calendario) && canViewPath(usuario, child.path),
          )
          return children.length ? [{ ...item, children }] : []
        }
        if ((item.id === 'visits' || item.id === 'activities') && !esTecnicoCampo(usuario)) return []
        if (!item.children) return canViewPath(usuario, item.path) ? [item] : []
        const children = item.children.filter((child) => canViewPath(usuario, child.path) && !(esTecnicoCampo(usuario) && child.id === 'visits-agenda'))
        const puedeVerGeneral = canViewPath(usuario, item.path)
        if (!children.length && !puedeVerGeneral) return []
        return [{ ...item, path: puedeVerGeneral ? item.path : '', children }]
      }),
    }))
    .filter((grupo) => grupo.items.length > 0)
}
