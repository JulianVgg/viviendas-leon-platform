// CIR-03: referencia de las 22 variedades expresamente proporcionadas por la ONG.
// No contiene familias, beneficiarios ni datos personales.
export const CULTIVOS_OFICIALES = Object.freeze([
  'Tomate', 'Chile pimiento', 'Chile jalapeño', 'Pepino', 'Brócoli',
  'Coliflor', 'Cebolla', 'Repollo', 'Rábano', 'Cilantro', 'Apio',
  'Zanahoria', 'Remolacha', 'Flor de muerto', 'Ruda', 'Albahaca',
  'Manzanilla', 'Frijol', 'Hierba mora', 'Acelga', 'Espinaca', 'Lechuga',
])

// Normalización exclusivamente ortográfica: NO fusionar variedades distintas.
// Ejemplo: Frijol y Frijol bolonillo conservan identidades diferentes.
export const claveCultivo = (nombre) => String(nombre).normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[-_]+/g, ' ')
  .trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-GT')

export function planCatalogo(actuales) {
  const byKey = new Map()
  for (const item of actuales) {
    const key = claveCultivo(item.nombre)
    byKey.set(key, [...(byKey.get(key) ?? []), item])
  }
  const filas = CULTIVOS_OFICIALES.map((nombre) => {
    const encontrados = byKey.get(claveCultivo(nombre)) ?? []
    if (encontrados.length > 1) return { nombre, accion: 'REVISAR_DUPLICADOS', ids: encontrados.map(x => x.id) }
    const cultivo = encontrados[0]
    if (!cultivo) return { nombre, accion: 'CREAR' }
    if (!cultivo.activo) return { nombre, accion: 'REVISAR_INACTIVO', id: cultivo.id, anterior: cultivo.nombre }
    if (cultivo.nombre !== nombre) return { nombre, accion: 'NORMALIZAR', id: cultivo.id, anterior: cultivo.nombre }
    return { nombre, accion: 'EXISTE', id: cultivo.id }
  })
  return {
    filas,
    resumen: {
      oficiales: CULTIVOS_OFICIALES.length,
      crear: filas.filter(x => x.accion === 'CREAR').length,
      normalizar: filas.filter(x => x.accion === 'NORMALIZAR').length,
      existentes: filas.filter(x => x.accion === 'EXISTE').length,
      revisar: filas.filter(x => x.accion.startsWith('REVISAR')).length,
    },
  }
}
