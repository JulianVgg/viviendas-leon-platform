/** Tasa administrativa: quetzales necesarios para un dólar. No altera las ventas originales. */
export function validateInstitutionalRate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{1,3}(?:\.\d{1,6})?$/.test(value)) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric >= 0.01 && numeric <= 100 ? value : null
}

/** Redondeo HALF_UP en centavos usando solo enteros: (GTQ / tasa) + USD existentes. */
export function equivalenciaUsd(totalGtq: string, totalUsd: string, rate: string): string {
  const cents = (amount: string): bigint => {
    if (!/^\d+\.\d{2}$/.test(amount)) throw new Error('Importe monetario inválido.')
    const [whole, fraction] = amount.split('.')
    return BigInt(whole) * 100n + BigInt(fraction)
  }
  if (!/^\d+(?:\.\d{1,6})?$/.test(rate)) throw new Error('Tasa inválida.')
  const [whole, decimals = ''] = rate.split('.')
  const millionths = BigInt(whole) * 1_000_000n + BigInt(decimals.padEnd(6, '0'))
  if (millionths <= 0n) throw new Error('Tasa inválida.')
  const converted = (cents(totalGtq) * 1_000_000n + millionths / 2n) / millionths
  const total = converted + cents(totalUsd)
  return `${total / 100n}.${String(total % 100n).padStart(2, '0')}`
}
