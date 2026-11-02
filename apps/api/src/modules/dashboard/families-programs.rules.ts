// MON-02: sumar familias únicas (una familia puede participar en varios programas).
// Los registros históricos permanecen en la base, pero no cuentan como participación vigente.
export type ParticipacionPrograma = { programaId: number; fechaIngreso: Date | null; fechaSalida: Date | null; estado: string | null }
export type FamiliaResumen = { id: number; comunidad: { nombre: string }; programas: ParticipacionPrograma[] }
export type ProgramaResumen = { id: number; nombre: string; estado: string }

export function participacionVigente(p: ParticipacionPrograma, hoy: string): boolean {
  const estado = (p.estado ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()
  if (['INACTIVO','INACTIVA','FINALIZADO','FINALIZADA','RETIRADO','RETIRADA','CANCELADO','CANCELADA','BAJA'].includes(estado)) return false
  const desde = p.fechaIngreso?.toISOString().slice(0,10)
  const hasta = p.fechaSalida?.toISOString().slice(0,10)
  return (!desde || desde <= hoy) && (!hasta || hasta >= hoy)
}

export function construirIndicadoresFamilias(familias: FamiliaResumen[], programas: ProgramaResumen[], hoy: string) {
  const total = familias.length
  const actuales = familias.map(f => ({ ...f, programasActivos: new Set(f.programas.filter(p=>participacionVigente(p,hoy)).map(p=>p.programaId)) }))
  const conPrograma = actuales.filter(f => f.programasActivos.size > 0).length
  const comunidades = new Map<string, { total: number; conPrograma: number }>()
  for (const familia of actuales) {
    const comunidad = familia.comunidad.nombre
    const valor = comunidades.get(comunidad) ?? {total:0,conPrograma:0}
    valor.total++
    if (familia.programasActivos.size) valor.conPrograma++
    comunidades.set(comunidad,valor)
  }
  return {
    totalFamilias: total, familiasConPrograma: conPrograma, familiasSinPrograma: total-conPrograma,
    porcentajeCobertura: total ? Math.round((conPrograma/total)*100) : 0,
    programas: programas.map(programa => {
      const familias = actuales.filter(f=>f.programasActivos.has(programa.id)).length
      return { id:programa.id, nombre:programa.nombre, estado:programa.estado, familias,
        porcentaje: total ? Math.round(familias/total*100) : 0 }
    }).sort((a,b)=>b.familias-a.familias||a.nombre.localeCompare(b.nombre,'es')),
    comunidades: [...comunidades].map(([nombre,v])=>({nombre,...v})).sort((a,b)=>b.total-a.total||a.nombre.localeCompare(b.nombre,'es')),
  }
}
