import { esSupervisorCalendario } from './calendarAccess'

// Los códigos deben coincidir exactamente con la checklist de RolesPermisosPage.tsx.
export type PermissionUser = { roles: string[]; permisos: string[] }

export function isDireccionGeneral(usuario: PermissionUser): boolean {
  return usuario.roles.some((rol) =>
    rol.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === 'direccion general',
  )
}

export const SCREEN_PERMISSIONS: Record<string, string> = {
  '/': 'PANTALLA_DASHBOARD',
  '/calendario': 'PANTALLA_CALENDARIO',
  '/mi-perfil': 'PANTALLA_MI_PERFIL',
  '/notificaciones': 'PANTALLA_NOTIFICACIONES',
  '/familias': 'PANTALLA_FAMILIAS',
  '/familias/nueva': 'PANTALLA_FAMILIAS_CREAR',
  '/familias/editar': 'PANTALLA_FAMILIAS_EDITAR',
  '/gestion-agricola': 'PANTALLA_GESTION_AGRICOLA',
  '/gestion-agricola/huertos': 'PANTALLA_HUERTOS',
  '/gestion-agricola/huertos/nuevo': 'PANTALLA_HUERTOS',
  '/gestion-agricola/ciclos': 'PANTALLA_CICLOS',
  '/gestion-agricola/cultivos': 'PANTALLA_CULTIVOS',
  '/gestion-agricola/produccion': 'PANTALLA_PRODUCCION',
  '/gestion-agricola/control-fitosanitario': 'PANTALLA_CONTROL_FITOSANITARIO',
  '/gestion-agricola/insumos': 'PANTALLA_INSUMOS',
  '/visitas': 'PANTALLA_VISITAS_AGENDA',
  '/visitas/agenda': 'PANTALLA_VISITAS_AGENDA',
  '/visitas/nueva': 'PANTALLA_VISITAS_NUEVA',
  '/visitas/historial': 'PANTALLA_VISITAS_HISTORIAL',
  '/actividades/visitas': 'PANTALLA_VISITAS_AGENDA',
  '/actividades': 'PANTALLA_ACTIVIDADES',
  '/actividades/asistencia-tecnica': 'PANTALLA_ASISTENCIA_TECNICA',
  '/actividades/capacitaciones': 'PANTALLA_CAPACITACIONES',
  '/actividades/capacitaciones/registrar': 'PANTALLA_CAPACITACIONES',
  '/actividades/capacitaciones/historial': 'PANTALLA_CAPACITACIONES',
  '/voluntariado': 'PANTALLA_VOLUNTARIADO',
  '/reportes': 'PANTALLA_REPORTES',
  '/reportes/reportes': 'PANTALLA_REPORTES_LISTA',
  '/reportes/indicadores': 'PANTALLA_INDICADORES',
  '/reportes/alertas': 'PANTALLA_ALERTAS',
  '/administracion': 'PANTALLA_ADMINISTRACION',
  '/administracion/comunidades': 'PANTALLA_COMUNIDADES',
  '/administracion/municipios': 'PANTALLA_MUNICIPIOS',
  '/administracion/programas': 'PANTALLA_PROGRAMAS',
  '/administracion/cultivos': 'PANTALLA_CULTIVOS',
  '/administracion/usuarios': 'PANTALLA_USUARIOS',
  '/administracion/roles-permisos': 'PANTALLA_ROLES_PERMISOS',
  '/administracion/configuracion': 'PANTALLA_CONFIGURACION',
  '/auditoria': 'PANTALLA_AUDITORIA',
  '/auditoria/bitacora': 'PANTALLA_BITACORA',
  '/offline-test': 'PANTALLA_OFFLINE_TEST',
  '/offline-operations-test': 'PANTALLA_OFFLINE_OPERACIONES',
  '/offline-queue-test': 'PANTALLA_OFFLINE_COLA',
  '/offline-connectivity-test': 'PANTALLA_OFFLINE_CONECTIVIDAD',
  '/offline-sync-test': 'PANTALLA_OFFLINE_SYNC',
}

export function permissionForPath(path: string): string | null {
  if (SCREEN_PERMISSIONS[path]) return SCREEN_PERMISSIONS[path]
  if (/^\/gestion-agricola\/ciclos\/[1-9]\d*$/.test(path)) return 'PANTALLA_CICLOS'
  if (/^\/familias\/[^/]+\/editar$/.test(path)) return 'PANTALLA_FAMILIAS_EDITAR'
  if (/^\/familias\/[^/]+$/.test(path)) return 'PANTALLA_FAMILIAS_DETALLE'
  return null
}

export function canWriteFamilies(usuario: PermissionUser): boolean {
  return isDireccionGeneral(usuario) || usuario.permisos.includes('FAMILIAS_WRITE')
}

export function canWriteGardens(usuario: PermissionUser): boolean {
  return isDireccionGeneral(usuario) || usuario.permisos.includes('HUERTOS_WRITE')
}

export function canWriteCrops(usuario: PermissionUser): boolean {
  return isDireccionGeneral(usuario) || usuario.permisos.includes('CULTIVOS_WRITE')
}

export function canWriteCommunities(usuario: PermissionUser): boolean {
  return isDireccionGeneral(usuario) || usuario.permisos.includes('COMUNIDADES_WRITE')
}

export function canWriteMunicipalities(usuario: PermissionUser): boolean {
  return isDireccionGeneral(usuario) || usuario.permisos.includes('MUNICIPIOS_WRITE')
}

export function canWritePrograms(usuario: PermissionUser): boolean {
  return isDireccionGeneral(usuario) || usuario.permisos.includes('PROGRAMAS_WRITE')
}

export function canViewPath(usuario: PermissionUser, path: string): boolean {
  // La captura técnica queda reservada a personal operativo, incluso para Dirección.
  if (path === '/visitas/nueva' && esSupervisorCalendario(usuario)) return false
  if (isDireccionGeneral(usuario)) return true
  if (path === '/calendario') return esSupervisorCalendario(usuario)
  // Bandeja personal disponible para cualquier usuario autenticado.
  if (path === '/' || path === '/mi-perfil' || path === '/notificaciones') return true
  const codigo = permissionForPath(path)
  if (!codigo) return false
  if (path.startsWith('/offline-') && !import.meta.env.DEV) return false
  if ((path === '/familias/nueva' || path === '/familias/editar' || /^\/familias\/[^/]+\/editar$/.test(path)) && !canWriteFamilies(usuario)) return false
  if (path === '/gestion-agricola/huertos/nuevo' && !canWriteGardens(usuario)) return false
  return usuario.permisos.includes(codigo)
}
