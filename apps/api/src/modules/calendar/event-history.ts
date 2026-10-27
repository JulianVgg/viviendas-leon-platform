/** Fecha local de Guatemala (sin depender del huso horario del servidor). */
export function fechaHoyGuatemala(ahora = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(ahora)
}

/** Un evento pasa a historial desde el día siguiente a su fecha de finalización. */
export function eventoYaFinalizo(fechaFin: Date, ahora = new Date()): boolean {
  return fechaFin.toISOString().slice(0, 10) < fechaHoyGuatemala(ahora)
}
