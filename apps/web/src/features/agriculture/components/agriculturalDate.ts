/** Presenta fechas civiles sin desplazarlas por la zona horaria del navegador. */
export function formatAgriculturalDate(value: string | null | undefined): string {
  if (!value) return 'Sin fecha'
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return value
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() !== Number(match[1]) ||
      date.getUTCMonth() + 1 !== Number(match[2]) || date.getUTCDate() !== Number(match[3])) return value
  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(date)
}
