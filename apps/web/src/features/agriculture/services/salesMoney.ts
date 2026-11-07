// CIR-09: vista previa exacta, sin Number/float (el servidor siempre valida el importe).
export function calculateSalePreview(quantity: string, price: string): string | null {
  if (!/^\d{1,9}(?:\.\d{1,3})?$/.test(quantity) || !/^\d{1,9}(?:\.\d{1,4})?$/.test(price)) return null
  const scaled = (value: string, decimals: number) => {
    const [integer, fractional = ''] = value.split('.')
    return BigInt(integer) * 10n ** BigInt(decimals) + BigInt(fractional.padEnd(decimals, '0'))
  }
  const product = scaled(quantity, 3) * scaled(price, 4)
  // Escala total 10^7, redondeo HALF_UP a centavos.
  const cents = (product * 100n + 5_000_000n) / 10_000_000n
  return cents > 0n ? `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}` : null
}
