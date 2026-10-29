// Privilegios de edición del propio perfil, independientes de la interfaz.
export function puedeEditarPerfilCompleto(roles: string[]): boolean {
  return roles.some(rol => {
    const nombre = rol.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
    return ['direccion general', 'coordinadora del programa agroforestal',
      'coordinador del programa agroforestal', 'coordinacion'].includes(nombre)
  })
}
