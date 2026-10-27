// Validación de parámetros provenientes de las URL, sin conversiones permisivas.
export type EstadoNotificacion = 'todas' | 'leidas' | 'no_leidas' | 'invitaciones'

export type ListarNotificacionesQuery = {
  pagina: number
  limite: number
  estado: EstadoNotificacion
}

export function parseNotificacionId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null
  const id = Number(value)
  // PostgreSQL SERIAL almacena enteros de 32 bits.
  return Number.isSafeInteger(id) && id <= 2_147_483_647 ? id : null
}

function parseEnteroPositivo(value: unknown, porDefecto: number, maximo: number): number | null {
  if (value === undefined) return porDefecto
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null
  const numero = Number(value)
  return Number.isSafeInteger(numero) && numero <= maximo ? numero : null
}

export function parseListarNotificacionesQuery(
  query: Record<string, unknown>,
): ListarNotificacionesQuery | null {
  const pagina = parseEnteroPositivo(query.pagina, 1, 10_000)
  const limite = parseEnteroPositivo(query.limite, 20, 100)
  const estado = query.estado ?? 'todas'
  if (pagina === null || limite === null ||
      (estado !== 'todas' && estado !== 'leidas' && estado !== 'no_leidas' && estado !== 'invitaciones')) return null
  return { pagina, limite, estado }
}
