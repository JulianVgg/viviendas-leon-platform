/** CIR-06: una evaluación técnica estima producción; nunca registra una cosecha. */
export const ORIGEN_ESTIMACION_VISITA = 'ESTIMACION_VISITA' as const

export function marcarEstimacionesVisita(datos: unknown): unknown {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return datos
  const captura = datos as Record<string, unknown>
  if (!Array.isArray(captura.crops)) return datos
  return {
    ...captura,
    crops: captura.crops.map(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return item
      const cultivo = item as Record<string, unknown>
      return cultivo.production === true
        ? { ...cultivo, origenProduccion: ORIGEN_ESTIMACION_VISITA }
        : cultivo
    }),
  }
}
