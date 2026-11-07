import { Prisma } from '../../generated/prisma/client.js'
import { harvestQuantityError, harvestUnitKind, type UnitIdentifier } from './production.units.js'

export const saleMoney = (cantidad: string, precioUnitario: string) =>
  new Prisma.Decimal(cantidad).mul(new Prisma.Decimal(precioUnitario)).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2)

export function availableToSell(produced: string, alreadySold: string, requested: string, unit: UnitIdentifier) {
  const kind = harvestUnitKind(unit)
  const quantityError = harvestQuantityError(requested, kind)
  if (quantityError) return { error: quantityError, remaining: '0' }
  const remaining = new Prisma.Decimal(produced).minus(new Prisma.Decimal(alreadySold))
  if (remaining.lessThan(0)) return { error: 'Las ventas históricas superan la producción; revisa el registro.', remaining: remaining.toString() }
  if (new Prisma.Decimal(requested).greaterThan(remaining)) {
    return { error: `La cantidad supera lo disponible (${remaining.toString()} ${unit.abreviatura ?? unit.codigo}).`, remaining: remaining.toString() }
  }
  return { error: null, remaining: remaining.toString() }
}

export function guatemalaToday(now = new Date()) {
  const values = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const value = (key: string) => values.find(item => item.type === key)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}
export const officialCurrency = (currency: { codigo: string; activo: boolean }) =>
  currency.activo && /^[A-Z]{3}$/.test(currency.codigo) && !currency.codigo.startsWith('SYN')
