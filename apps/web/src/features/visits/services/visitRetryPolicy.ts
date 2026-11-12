/** Reintentos automáticos solo para fallos transitorios de transporte o API.
 * Un rechazo de validación debe corregirse desde Historial, no repetirse.
 */
export function canRetryVisitSync(message: string | undefined): boolean {
  if (!message) return false
  return /failed to fetch|networkerror|network error|load failed|error de red|fetch failed|inicia sesi[oó]n para sincronizar|connection reset|timeout|aborterror|http (?:401|429|5\d\d)/i.test(message)
}

export function retryDelayMs(attempts: number): number {
  return Math.min(15 * 60_000, 10_000 * 2 ** Math.min(7, Math.max(0, attempts - 1)))
}
