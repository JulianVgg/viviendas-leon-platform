/** Solo anuncia IDs posteriores al último conocido. No revive mensajes al navegar. */
export function detectarAvisoNuevo<T extends { id: number }>(
  anteriores: number | null, actuales: T[],
): { ultimoId: number; nuevo: T | null } {
  const ultimoId = Math.max(anteriores ?? 0, ...actuales.map(n => n.id))
  if (anteriores === null) return { ultimoId, nuevo: null } // Primera carga: establecer referencia.
  const nuevo = actuales.filter(n => n.id > anteriores).sort((a, b) => b.id - a.id)[0] ?? null
  return { ultimoId, nuevo }
}
