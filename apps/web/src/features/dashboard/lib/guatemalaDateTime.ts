/** Fecha y hora institucional, independiente del idioma o zona horaria del navegador. */
export function formatoFechaHoraGuatemala(fecha: Date): string {
  return new Intl.DateTimeFormat('es-GT', {
    timeZone: 'America/Guatemala', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  }).format(fecha)
}
