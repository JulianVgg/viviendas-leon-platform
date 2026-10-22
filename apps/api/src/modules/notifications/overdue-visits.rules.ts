/** NTF-08: la fecha de una visita es civil (@db.Date), no una hora UTC. */
export const INTERVALO_VISITAS_VENCIDAS_MS = 60_000
export const LOTE_VISITAS_VENCIDAS = 200

export function hoyEnGuatemala(ahora: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(ahora)
}

export function visitaVencida(estado: string, fecha: string, hoy: string): boolean {
  // NO_CUMPLIO es una decisión institucional, no una consecuencia del reloj.
  return estado === 'PROGRAMADA' && fecha < hoy
}

export function claveAvisoVisitaVencida(visitaId: number, fecha: string, usuarioId: number): string {
  return `VISV:${visitaId}:${fecha}:${usuarioId}`
}

export function esRolSupervisor(roles: string[]): boolean {
  const normalizados = roles.map(r => r.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase())
  return normalizados.includes('direccion general') || normalizados.includes('coordinadora del programa agroforestal')
}

export type RolDestinatarioVisita = { nombre: string; permisos: { permiso: { codigo: string } }[] }
export function puedeConsultarVisitas(roles: RolDestinatarioVisita[]): boolean {
  if (esRolSupervisor(roles.map(r => r.nombre))) return true
  const permisos = new Set(roles.flatMap(r => r.permisos.map(p => p.permiso.codigo)))
  return permisos.has('PANTALLA_VISITAS_AGENDA') &&
    ['VISITAS_READ', 'VISITAS_WRITE', 'SYN-VISITAS-WRITE'].some(p => permisos.has(p))
}

export function avisoVencimientoVisita(visita: { id: number; fecha: string; familia: string }, supervisor: boolean) {
  return {
    tipo: 'VISITA_VENCIDA',
    titulo: supervisor ? 'Visita vencida — requiere seguimiento' : 'Tienes una visita técnica vencida',
    mensaje: `La visita técnica de ${visita.familia} programada para el ${visita.fecha} continúa pendiente. ${supervisor ? 'Revisa la agenda y coordina su seguimiento.' : 'Registra la visita o solicita su reprogramación.'}`,
    referencia: '/visitas/agenda',
  }
}
