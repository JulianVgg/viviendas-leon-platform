// CIR-05: unidades de cosecha. Las plantas del ciclo no son unidades cosechadas.
// No se define equivalencia kg <-> unidad <-> manojo: requiere medición específica.
export type HarvestUnitKind = 'kg' | 'unidades' | 'manojos' | 'otra'
export type UnitIdentifier = { codigo: string; nombre?: string; abreviatura?: string | null }

const strip = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .trim().toLowerCase().replace(/\./g, '').replace(/[-_]/g, ' ')
  .replace(/\s+/g, ' ')
const match = (value: string): HarvestUnitKind => {
  const key = strip(value).replace(/^syn /, '')
  if (['kg', 'kgs', 'kilogramo', 'kilogramos', 'kilo', 'kilos'].includes(key)) return 'kg'
  if (['u', 'ud', 'und', 'unid', 'uds', 'unidad', 'unidades', 'pieza', 'piezas'].includes(key)) return 'unidades'
  if (['manojo', 'manojos'].includes(key)) return 'manojos'
  return 'otra'
}

export function harvestUnitKind(unit: UnitIdentifier): HarvestUnitKind {
  const detected = new Set([unit.codigo, unit.nombre ?? '', unit.abreviatura ?? '']
    .map(match).filter(kind => kind !== 'otra'))
  // Un catálogo contradictorio no se acepta por una abreviatura accidental.
  return detected.size === 1 ? [...detected][0] : 'otra'
}

export function isOfficialHarvestUnit(unit: UnitIdentifier & { activo: boolean }): boolean {
  return unit.activo && !/^SYN-/i.test(unit.codigo) && harvestUnitKind(unit) !== 'otra'
}

export function harvestQuantityError(quantity: string, kind: HarvestUnitKind): string | null {
  if (kind === 'otra') return 'Selecciona una unidad de cosecha compatible (kg, unidades o manojos).'
  if (!/^\d{1,9}(?:\.\d{1,3})?$/.test(quantity) || Number(quantity) <= 0) {
    return 'Ingresa una cantidad positiva de hasta nueve dígitos y tres decimales.'
  }
  if (kind !== 'kg' && !/^\d{1,9}$/.test(quantity)) {
    return 'Las unidades y los manojos deben registrarse en números enteros.'
  }
  return null
}
