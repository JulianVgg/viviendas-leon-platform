/** Permiso operativo para emitir el Excel. No concede acceso a las rutas de revisión anteriores. */
export function esCoordinacionReportes(roles: string[]): boolean {
  const nombres = new Set(['coordinadora del programa agroforestal', 'coordinador del programa agroforestal', 'coordinacion'])
  return roles.some(rol => nombres.has(rol.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()))
}
