/** Resumen de tratamientos para el historial autorizado de visitas. */
export type TratamientoVisita = {
  cicloCultivoId: number
  insumoId: number
  nombre: string
  categoria: string
  fecha: string | null
  cantidad: string | null
  unidad: string | null
  observaciones: string | null
}

type RegistroAplicacion = {
  evaluacionCultivo: { visitaId: number; cicloCultivoId: number }
  insumoId: number
  insumo: { nombre: string; categoriaInsumo: { nombre: string } }
  fechaAplicacion: Date | null
  cantidad: { toString(): string } | null
  unidadMedida: { abreviatura: string | null; nombre: string } | null
  observaciones: string | null
}

export function tratamientosPorVisita(registros: RegistroAplicacion[]): Map<number, TratamientoVisita[]> {
  const porVisita = new Map<number, TratamientoVisita[]>()
  for (const registro of registros) {
    const { visitaId, cicloCultivoId } = registro.evaluacionCultivo
    const lista = porVisita.get(visitaId) ?? []
    lista.push({
      cicloCultivoId,
      insumoId: registro.insumoId,
      nombre: registro.insumo.nombre,
      categoria: registro.insumo.categoriaInsumo.nombre,
      fecha: registro.fechaAplicacion?.toISOString().slice(0, 10) ?? null,
      cantidad: registro.cantidad?.toString() ?? null,
      unidad: registro.unidadMedida?.abreviatura || registro.unidadMedida?.nombre || null,
      observaciones: registro.observaciones,
    })
    porVisita.set(visitaId, lista)
  }
  return porVisita
}
