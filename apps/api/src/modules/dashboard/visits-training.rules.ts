import { fechaLocalGuatemala, periodoDashboard } from './dashboard-summary.rules.js'

type VisitaIndicador = {
  id: number
  fecha: Date
  estado: string
  usuarioResponsableId: number
  usuarioResponsable: { nombre: string; apellido: string | null }
  reprogramaciones: Array<{ id: number }>
}
type CapacitacionIndicador = {
  id: number
  fecha: Date
  estado: string
  usuarioResponsableId: number | null
  usuarioResponsable: { nombre: string; apellido: string | null } | null
}

const nombreUsuario = (usuario: {nombre: string; apellido: string | null} | null) => usuario
  ? `${usuario.nombre} ${usuario.apellido ?? ''}`.trim() : 'Sin responsable'

export function limitesMon03(ahora: Date, meses: number) {
  const periodo = periodoDashboard(ahora, meses)
  const ultimaClave = periodo.claves[periodo.claves.length - 1]
  const [anio, mes] = ultimaClave.split('-').map(Number)
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10)
  return { desde: periodo.desde, hasta: ultimoDia, hoy: fechaLocalGuatemala(ahora) }
}

// La categoría vencida se deriva de la fecha; no modifica el estado de la visita.
export function clasificarVisita(estado: string, fecha: Date, hoy: string) {
  if (estado === 'REALIZADA') return 'realizada'
  if (estado === 'PROGRAMADA' && fecha.toISOString().slice(0, 10) < hoy) return 'vencida'
  if (estado === 'PROGRAMADA') return 'programada'
  return 'otra'
}

export function resumirActividadOperativa(visitas: VisitaIndicador[], capacitaciones: CapacitacionIndicador[], hoy: string) {
  const resumen = {
    visitas: { realizadas: 0, programadas: 0, vencidas: 0, reprogramadas: 0 },
    capacitaciones: { realizadas: 0, programadas: 0, otras: 0 },
  }
  const porResponsable = new Map<string, { id: string; nombre: string; visitas: number; capacitaciones: number }>()
  function responsable(id: number | null, usuario: { nombre: string; apellido: string | null } | null) {
    const key = id === null ? 'sin-responsable' : String(id)
    if (!porResponsable.has(key)) porResponsable.set(key, { id: key, nombre: nombreUsuario(usuario), visitas: 0, capacitaciones: 0 })
    return porResponsable.get(key)!
  }
  for (const visita of visitas) {
    const tipo = clasificarVisita(visita.estado, visita.fecha, hoy)
    if (tipo === 'realizada') { resumen.visitas.realizadas++; responsable(visita.usuarioResponsableId, visita.usuarioResponsable).visitas++ }
    if (tipo === 'programada') resumen.visitas.programadas++
    if (tipo === 'vencida') resumen.visitas.vencidas++
    if (visita.reprogramaciones.length) resumen.visitas.reprogramadas++
  }
  for (const capacitacion of capacitaciones) {
    if (capacitacion.estado === 'REALIZADA') { resumen.capacitaciones.realizadas++; responsable(capacitacion.usuarioResponsableId, capacitacion.usuarioResponsable).capacitaciones++ }
    else if (capacitacion.estado === 'PROGRAMADA') resumen.capacitaciones.programadas++
    else resumen.capacitaciones.otras++
  }
  return {
    ...resumen,
    porResponsable: [...porResponsable.values()].sort((a,b) => b.visitas+b.capacitaciones-(a.visitas+a.capacitaciones) || a.nombre.localeCompare(b.nombre, 'es')),
  }
}
