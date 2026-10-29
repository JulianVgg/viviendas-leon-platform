/** Filtros exclusivamente visuales: el servidor sigue limitando los registros por usuario y permisos. */
export type TipoAgenda = 'todos' | 'visitas' | 'compromisos' | 'eventos' | 'capacitaciones' | 'reprogramaciones'
export type EstadoAgenda = 'todos' | 'programadas' | 'vencidas' | 'realizadas' | 'finalizadas' | 'pendientes' | 'no-cumplido'
export type FiltrosAgenda = { tipo: TipoAgenda; estado: EstadoAgenda; busqueda: string }

export type ActividadAgenda = {
  key: string
  label: string
  kind: 'visit' | 'followup' | 'visit-history' | 'followup-history' | 'institutional' | 'training'
  training?: { tema: string; estado: string; fecha: string; comunidad: { nombre: string } | null; facilitadorNombre: string | null }
  visit?: { status: string; date: string; familyName: string; community: string }
  followup?: { status: string; familyName: string; community: string; due: string | null }
  invitation?: { titulo: string; categoria: string; lugar: string; fechaFin: string }
}

export const filtrosIniciales: FiltrosAgenda = { tipo: 'todos', estado: 'todos', busqueda: '' }

export function filtrarAgenda<T extends ActividadAgenda>(items: readonly T[], filtros: FiltrosAgenda, hoy: string): T[] {
  const normalizar = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-GT').trim()
  const texto = normalizar(filtros.busqueda)
  return items.filter(item => {
    const reprogramacion = item.kind.endsWith('-history')
    if (filtros.tipo !== 'todos' && !(
      (filtros.tipo === 'visitas' && item.kind === 'visit') ||
      (filtros.tipo === 'compromisos' && item.kind === 'followup') ||
      (filtros.tipo === 'eventos' && item.kind === 'institutional') ||
      (filtros.tipo === 'capacitaciones' && item.kind === 'training') ||
      (filtros.tipo === 'reprogramaciones' && reprogramacion)
    )) return false

    if (filtros.estado !== 'todos') {
      const estado = item.kind === 'visit'
        ? item.visit?.status === 'REALIZADA' ? 'realizadas' : item.visit?.date && item.visit.date < hoy ? 'vencidas' : 'programadas'
        : item.kind === 'followup'
          ? item.followup?.status === 'NO_CUMPLIDO' ? 'no-cumplido' : item.followup?.due && item.followup.due < hoy ? 'vencidas' : 'pendientes'
          : item.kind === 'institutional' ? item.invitation?.fechaFin && item.invitation.fechaFin < hoy ? 'finalizadas' : 'programadas'
          : item.kind === 'training' ? item.training?.estado === 'REALIZADA' ? 'realizadas' : item.training?.fecha && item.training.fecha < hoy ? 'vencidas' : 'programadas' : 'reprogramaciones'
      if (filtros.estado !== estado) return false
    }

    if (!texto) return true
    return normalizar([
      item.label, item.visit?.familyName, item.visit?.community,
      item.followup?.familyName, item.followup?.community,
      item.invitation?.titulo, item.invitation?.categoria, item.invitation?.lugar,
      item.training?.tema, item.training?.comunidad?.nombre, item.training?.facilitadorNombre,
    ].filter(Boolean).join(' ')).includes(texto)
  })
}
