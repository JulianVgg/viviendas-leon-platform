// CIR-10: calculos exactos de GTQ/USD, sin Number ni cotizaciones supuestas.
// quetzalesPorDolar expresa cuantos GTQ equivalen a 1 USD.
export type ExchangeRateInput = {
  fecha: string
  quetzalesPorDolar: string
  fuente: string
  referencia: string
}
export type ExchangeFieldError = { field: string; message: string }

export function validIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const textOk = (value: unknown, maxLength: number) => typeof value === 'string' &&
  value.trim().length > 0 && value.trim().length <= maxLength &&
  !/[\u0000-\u001f\u007f]/.test(value)

export function validateExchangeRateInput(body: unknown, today: string): { data?: ExchangeRateInput; details: ExchangeFieldError[] } {
  if (!body || Array.isArray(body) || typeof body !== 'object') {
    return { details: [{ field: 'body', message: 'Envía un objeto válido.' }] }
  }
  const src = body as Record<string, unknown>
  const details: ExchangeFieldError[] = []
  for (const key of Object.keys(src)) {
    if (!['fecha', 'quetzalesPorDolar', 'fuente', 'referencia'].includes(key)) {
      details.push({ field: key, message: 'Campo no permitido.' })
    }
  }
  if (!validIsoDate(src.fecha) || src.fecha > today) {
    details.push({ field: 'fecha', message: 'Selecciona una fecha válida, no futura.' })
  }
  if (typeof src.quetzalesPorDolar !== 'string' ||
    !/^\d{1,4}(?:\.\d{1,6})?$/.test(src.quetzalesPorDolar) ||
    /^0+(?:\.0+)?$/.test(src.quetzalesPorDolar)) {
    details.push({ field: 'quetzalesPorDolar', message: 'Indica GTQ por USD, mayor que cero y hasta seis decimales.' })
  }
  if (!textOk(src.fuente, 120)) details.push({ field: 'fuente', message: 'Indica la fuente (máximo 120 caracteres).' })
  if (!textOk(src.referencia, 250)) details.push({ field: 'referencia', message: 'Indica la referencia verificable (máximo 250 caracteres).' })
  if (details.length) return { details }
  return { details, data: {
    fecha: src.fecha as string,
    quetzalesPorDolar: src.quetzalesPorDolar as string,
    fuente: (src.fuente as string).trim(),
    referencia: (src.referencia as string).trim(),
  } }
}

function scaled(value: string, digits: number): bigint | null {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return null
  const [integer, decimal = ''] = value.split('.')
  if (decimal.length > digits) return null
  return BigInt(integer) * (10n ** BigInt(digits)) + BigInt(decimal.padEnd(digits, '0'))
}
function formattedCents(cents: bigint): string {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`
}

/** Convierte un total ya redondeado a centavos, usando tasa exacta de su fecha. */
export function convertSaleTotal(total: string, currency: string, quetzalesPorDolar: string): {
  totalGTQ: string; totalUSD: string
} | null {
  if (!/^\d+\.\d{2}$/.test(total) || !['GTQ', 'USD'].includes(currency)) return null
  const cents = scaled(total, 2)
  const rate = scaled(quetzalesPorDolar, 6)
  if (cents === null || rate === null || rate <= 0n) return null
  const unit = 1_000_000n
  // ROUND_HALF_UP para importes no negativos. No se introduce coma flotante.
  const converted = currency === 'GTQ'
    ? (cents * unit + rate / 2n) / rate
    : (cents * rate + unit / 2n) / unit
  return currency === 'GTQ'
    ? { totalGTQ: total, totalUSD: formattedCents(converted) }
    : { totalGTQ: formattedCents(converted), totalUSD: total }
}
