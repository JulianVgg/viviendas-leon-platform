/** Fecha y hora institucional, independiente del idioma o zona horaria del navegador. */
export function formatoFechaHoraGuatemala(fecha: Date): string {
  return new Intl.DateTimeFormat('es-GT', {
    timeZone: 'America/Guatemala', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  }).format(fecha)
}

/** Saludo en hora de Guatemala (no depende de la zona horaria del dispositivo). */
export function saludoGuatemala(fecha: Date): string {
  const hora = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Guatemala', hour: '2-digit', hourCycle: 'h23',
  }).format(fecha))
  if (hora < 12) return 'Buenos días'
  if (hora < 18) return 'Buenas tardes'
  return 'Buenas noches'
}
