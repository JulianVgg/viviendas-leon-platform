// La comparación se hace en la fecha civil de Guatemala, sin depender de TZ del servidor.
export function fechaHoyGuatemala(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ahora)
  const dato = (tipo: string) => partes.find(p => p.type === tipo)?.value ?? ''
  return `${dato('year')}-${dato('month')}-${dato('day')}`
}
export function fechaAnteriorAHoy(fecha: string, ahora: Date = new Date()): boolean {
  return fecha < fechaHoyGuatemala(ahora)
}
