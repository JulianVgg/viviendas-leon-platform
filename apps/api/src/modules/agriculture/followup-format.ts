// AGR-04: preserva registros previos donde solo se almacenaba la cantidad de plantas
// en EvaluacionCultivo.observaciones, sin migraciones ni alteracion de visitas historicas.
const plantsPrefix = /^Plantas observadas: (\d+)\.(?:\r?\n|$)/u

export function buildEvaluationObservations(plants: unknown, observation: unknown): string | null {
  const count = typeof plants === 'number' && Number.isSafeInteger(plants) && plants >= 0
    ? `Plantas observadas: ${plants}.` : ''
  const note = typeof observation === 'string' ? observation.trim() : ''
  return [count, note].filter(Boolean).join('\n') || null
}

export function parseEvaluationObservations(value: string | null): {
  cantidadPlantasObservadas: number | null
  observaciones: string | null
} {
  if (!value) return { cantidadPlantasObservadas: null, observaciones: null }
  const match = plantsPrefix.exec(value)
  if (!match) return { cantidadPlantasObservadas: null, observaciones: value.trim() || null }
  const count = Number(match[1])
  const notes = value.slice(match[0].length).trim()
  return {
    cantidadPlantasObservadas: Number.isSafeInteger(count) ? count : null,
    observaciones: notes || null,
  }
}
