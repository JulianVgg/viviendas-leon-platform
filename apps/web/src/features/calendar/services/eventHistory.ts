/** Misma regla para el frontend que para la API: cierre por fecha en Guatemala. */
export function eventoHaPasado(fechaFin: string, ahora = new Date()): boolean {
  const hoy = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(ahora)
  return /^\d{4}-\d{2}-\d{2}$/.test(fechaFin) && fechaFin < hoy
}
