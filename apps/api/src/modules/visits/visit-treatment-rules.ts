/** Valida los identificadores de productos aplicados a una evaluación.
 * `undefined` conserva las capturas de visitas anteriores al catálogo técnico. */
export function parseVisitTreatmentIds(input: unknown): number[] | null {
  if (input === undefined) return []
  if (!Array.isArray(input) || input.length > 12) return null
  if (input.some((id: unknown) => !Number.isSafeInteger(id) || Number(id) < 1 || Number(id) > 2147483647)) return null
  if (new Set(input).size !== input.length) return null
  return input as number[]
}
