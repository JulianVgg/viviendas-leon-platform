import type { CalendarEvent, CalendarTechnicalVisit, CalendarTraining } from './calendarService'

export type ActividadFiltro = 'todos' | 'evento' | 'visita' | 'capacitacion'
export type EstadoFiltro = 'todos' | 'programada' | 'realizada' | 'vencida' | 'finalizada'
export type ActividadEquipo =
  | { key: string; kind: 'institutional'; event: CalendarEvent }
  | { key: string; kind: 'technical'; visit: CalendarTechnicalVisit }
  | { key: string; kind: 'training'; training: CalendarTraining }
export function fechaActividad(item: ActividadEquipo): string {
  return item.kind === 'institutional' ? item.event.fechaInicio : item.kind === 'technical' ? item.visit.fecha : item.training.fecha
}
export function responsableActividad(item: ActividadEquipo): string {
  return item.kind === 'institutional' ? item.event.responsable.nombre : item.kind === 'technical' ? item.visit.responsable : item.training.facilitador
}
export function comunidadActividad(item: ActividadEquipo): string {
  return item.kind === 'technical' ? item.visit.comunidad : item.kind === 'training' ? item.training.comunidad : ''
}
export function estadoActividad(item: ActividadEquipo, hoy: string): Exclude<EstadoFiltro, 'todos'> {
  if (item.kind === 'institutional') return item.event.fechaFin < hoy ? 'finalizada' : 'programada'
  if (item.kind === 'technical') return item.visit.estado === 'REALIZADA' ? 'realizada' : item.visit.fecha < hoy ? 'vencida' : 'programada'
  const estado = item.training.estado.toUpperCase()
  if (estado.includes('REALIZ') || estado.includes('COMPLET') || estado.includes('FINALIZ')) return 'realizada'
  return item.training.fecha < hoy ? 'vencida' : 'programada'
}
export function filtrarActividades(items: ActividadEquipo[], filtros: {
  tipo: ActividadFiltro; estado: EstadoFiltro; responsable: string; comunidad: string
}, hoy: string): ActividadEquipo[] {
  const normal = (text: string) => text.trim().toLocaleLowerCase('es-GT')
  return items.filter(item =>
    (filtros.tipo === 'todos' || (filtros.tipo === 'evento' && item.kind === 'institutional') ||
      (filtros.tipo === 'visita' && item.kind === 'technical') || (filtros.tipo === 'capacitacion' && item.kind === 'training')) &&
    (filtros.estado === 'todos' || estadoActividad(item,hoy) === filtros.estado) &&
    (!filtros.responsable || normal(responsableActividad(item)) === normal(filtros.responsable)) &&
    (!filtros.comunidad || normal(comunidadActividad(item)) === normal(filtros.comunidad))
  )
}
