/** La asignación es jerárquica. No existe rechazo unilateral de asistencia. */
export function nivelInstitucional(roles: string[]): number {
  const nombres = roles.map(rol => rol.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase())
  if (nombres.includes('direccion general')) return 2
  if (nombres.some(rol => ['coordinadora del programa agroforestal',
    'coordinador del programa agroforestal', 'coordinacion'].includes(rol))) return 1
  return 0
}
