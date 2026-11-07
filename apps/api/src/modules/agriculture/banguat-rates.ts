// Tipos de cambio de referencia publicados por el Banco de Guatemala.
// Solo se consultan fechas de ventas; nunca se envían datos personales al proveedor.
const URL = 'https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx'
const NS = 'http://www.banguat.gob.gt/variables/ws/'
export const BANGUAT_REFERENCE_URL = 'https://www.banguat.gob.gt/tipo_cambio/'

export type BanguatRate = { fecha: string; quetzalesPorDolar: string }
const iso = /^\d{4}-\d{2}-\d{2}$/
const xmlTag = (fragment: string, name: string) =>
  new RegExp(`<(?:(?:[A-Za-z0-9]+):)?${name}\\s*>([^<]*)<\\/(?:(?:[A-Za-z0-9]+):)?${name}>`, 'i')
    .exec(fragment)?.[1]?.trim() ?? ''

export function parseBanguatRates(xml: string): BanguatRate[] {
  if (xml.length > 1_000_000 || /<(?:(?:\w+):)?Fault(?:\s|>)/i.test(xml)) return []
  const rows: BanguatRate[] = []
  const nodes = xml.matchAll(/<(?:\w+:)?VarDolar(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?VarDolar>/gi)
  for (const match of nodes) {
    const date = xmlTag(match[1], 'fecha').split(' ')[0]
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date)
    if (!m) continue
    const fecha = `${m[3]}-${m[2]}-${m[1]}`
    const valid = new Date(`${fecha}T00:00:00.000Z`)
    if (!iso.test(fecha) || Number.isNaN(valid.getTime()) || valid.toISOString().slice(0, 10) !== fecha) continue
    const quetzalesPorDolar = xmlTag(match[1], 'referencia')
    if (!/^\d{1,3}(?:\.\d{1,6})?$/.test(quetzalesPorDolar)) continue
    const rate = Number(quetzalesPorDolar)
    if (!Number.isFinite(rate) || rate < 1 || rate > 100) continue
    rows.push({ fecha, quetzalesPorDolar })
  }
  return rows
}

// Evita consultar continuamente las mismas fechas cuando Banguat está temporalmente inaccesible.
const lastAttempt = new Map<string, number>()
const ATTEMPT_INTERVAL_MS = 15 * 60 * 1000

/** Consulta el rango requerido y devuelve únicamente tasas correspondientes a fechas solicitadas. */
export async function fetchBanguatRates(dates: string[], request: typeof fetch = fetch): Promise<BanguatRate[]> {
  const now = Date.now()
  const missing = [...new Set(dates.filter(date => iso.test(date) &&
    now - (lastAttempt.get(date) ?? 0) > ATTEMPT_INTERVAL_MS))].sort()
  if (!missing.length) return []
  // No solicitar rangos excesivos por un error o una consulta de datos históricos extensísima.
  const span = Date.parse(missing[missing.length - 1]) - Date.parse(missing[0])
  if (span > 366 * 86_400_000) return []
  missing.forEach(date => lastAttempt.set(date, now))
  const toBanguat = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`
  const body = `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
    `<soap:Body><TipoCambioRango xmlns="${NS}"><fechainit>${toBanguat(missing[0])}</fechainit>` +
    `<fechafin>${toBanguat(missing[missing.length - 1])}</fechafin></TipoCambioRango></soap:Body></soap:Envelope>`
  try {
    const response = await request(URL, { method: 'POST', signal: AbortSignal.timeout(5000),
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: `"${NS}TipoCambioRango"` }, body })
    if (!response.ok) return []
    const length = Number(response.headers.get('content-length') || '0')
    if (length > 1_000_000) return []
    const xml = await response.text()
    const wanted = new Set(missing)
    return parseBanguatRates(xml).filter(row => wanted.has(row.fecha))
  } catch { return [] }
}
