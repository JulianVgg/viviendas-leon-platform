/** Exportación agrícola: acceso de Dirección y Coordinación, validado en API. */
export function puedeExportarReporteAgricola(roles: string[]): boolean {
  const habilitados = new Set(['direccion general', 'coordinadora del programa agroforestal', 'coordinador del programa agroforestal', 'coordinacion'])
  return roles.some(rol => habilitados.has(rol.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()))
}
// Alias para mantener compatibilidad con las verificaciones anteriores.
export const esCoordinacionReportes = puedeExportarReporteAgricola
