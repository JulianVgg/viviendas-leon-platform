// NTF-03: reglas de negocio puras; los tests no requieren PostgreSQL.
export type EventoResumen = {
  titulo: string
  categoria: string
  descripcion: string | null
  fecha: string // YYYY-MM-DD
  horaInicio?: string | null
  horaFin?: string | null
  participantesIds: number[]
}

export type TipoAvisoCalendario =
  | 'CALENDARIO_ASIGNACION'
  | 'CALENDARIO_CAMBIO'
  | 'CALENDARIO_DESASIGNACION'
  | 'CALENDARIO_CANCELACION'

export type DestinatarioCalendario = { usuarioId: number; tipo: TipoAvisoCalendario }

export function planificarCambioCalendario(anterior: EventoResumen, siguiente: EventoResumen): DestinatarioCalendario[] {
  const antiguos = new Set(anterior.participantesIds)
  const nuevos = new Set(siguiente.participantesIds)
  const cambioDetalle = anterior.titulo !== siguiente.titulo || anterior.categoria !== siguiente.categoria ||
    (anterior.descripcion ?? '') !== (siguiente.descripcion ?? '') || anterior.fecha !== siguiente.fecha ||
    (anterior.horaInicio ?? null) !== (siguiente.horaInicio ?? null) || (anterior.horaFin ?? null) !== (siguiente.horaFin ?? null)
  const avisos: DestinatarioCalendario[] = []
  for (const id of nuevos) {
    if (!antiguos.has(id)) avisos.push({ usuarioId: id, tipo: 'CALENDARIO_ASIGNACION' })
    else if (cambioDetalle) avisos.push({ usuarioId: id, tipo: 'CALENDARIO_CAMBIO' })
  }
  for (const id of antiguos) {
    if (!nuevos.has(id)) avisos.push({ usuarioId: id, tipo: 'CALENDARIO_DESASIGNACION' })
  }
  return avisos
}

export function descripcionAvisoCalendario(tipo: TipoAvisoCalendario, evento: EventoResumen): { titulo: string; mensaje: string } {
  const horario = evento.horaInicio && evento.horaFin ? `, ${evento.horaInicio}–${evento.horaFin}` : ''
  const detalle = `${evento.titulo} (${evento.fecha}${horario})`
  switch (tipo) {
    case 'CALENDARIO_ASIGNACION': return { titulo: 'Nueva actividad asignada', mensaje: `Te asignaron a la actividad ${detalle}.` }
    case 'CALENDARIO_CAMBIO': return { titulo: 'Actividad actualizada', mensaje: `Se modificó la actividad ${detalle}. Consulta el calendario para ver los cambios.` }
    case 'CALENDARIO_DESASIGNACION': return { titulo: 'Asignación retirada', mensaje: `Dejaste de estar asignado a la actividad ${detalle}.` }
    case 'CALENDARIO_CANCELACION': return { titulo: 'Actividad cancelada', mensaje: `Se canceló la actividad ${detalle}.` }
  }
}

export type TipoAvisoVisita = 'VISITA_PROGRAMADA' | 'VISITA_REPROGRAMADA' | 'VISITA_CANCELADA'
export function descripcionAvisoVisita(tipo: TipoAvisoVisita, familia: string, fecha: string) {
  const detalle = `la familia ${familia} (${fecha})`
  switch (tipo) {
    case 'VISITA_PROGRAMADA': return { titulo: 'Visita técnica programada', mensaje: `Se programó una visita a ${detalle}.` }
    case 'VISITA_REPROGRAMADA': return { titulo: 'Visita técnica reprogramada', mensaje: `Se reprogramó tu visita a ${detalle}.` }
    case 'VISITA_CANCELADA': return { titulo: 'Visita técnica cancelada', mensaje: `Se canceló la visita a ${detalle}.` }
  }
}

/** Detecta cambios incluso cuando el evento todavía no tiene participantes. */
export function eventoTieneCambios(anterior: EventoResumen, siguiente: EventoResumen): boolean {
  return anterior.titulo !== siguiente.titulo || anterior.categoria !== siguiente.categoria ||
    (anterior.descripcion ?? '') !== (siguiente.descripcion ?? '') || anterior.fecha !== siguiente.fecha ||
    (anterior.horaInicio ?? null) !== (siguiente.horaInicio ?? null) || (anterior.horaFin ?? null) !== (siguiente.horaFin ?? null) ||
    anterior.participantesIds.length !== siguiente.participantesIds.length ||
    anterior.participantesIds.some(id => !siguiente.participantesIds.includes(id))
}
