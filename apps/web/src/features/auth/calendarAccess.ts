import type { PermissionUser } from './screenPermissions'

export const normalizarRol = (rol: string) => rol.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

export function esSupervisorCalendario(usuario: PermissionUser): boolean {
  return usuario.roles.some(rol => {
    const nombre = normalizarRol(rol)
    return nombre === 'direccion general' || nombre === 'coordinadora del programa agroforestal' ||
      nombre === 'coordinador del programa agroforestal' || nombre === 'coordinacion'
  })
}

export function esTecnicoCampo(usuario: PermissionUser): boolean {
  return !esSupervisorCalendario(usuario) && usuario.roles.some(rol => normalizarRol(rol).includes('tecnico'))
}
