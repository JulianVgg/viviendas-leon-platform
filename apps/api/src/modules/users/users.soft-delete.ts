// CIR-24: reglas puras para la eliminación lógica.
export const ESTADO_ELIMINADO = 'ELIMINADO' as const

export function esEliminado(estado: string): boolean {
  return estado === ESTADO_ELIMINADO
}

export function validarEliminacion(id: number, actorId: number): 'ID_INVALIDO' | 'CUENTA_PROPIA' | null {
  if (!Number.isSafeInteger(id) || id <= 0) return 'ID_INVALIDO'
  if (id === actorId) return 'CUENTA_PROPIA'
  return null
}
