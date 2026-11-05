// CIR-05: unidades de cosecha. No se presume equivalencia de pesos, piezas y manojos.
export const UNIDADES_COSECHA = Object.freeze([
  { codigo: 'KG', nombre: 'Kilogramo', abreviatura: 'kg', tipo: 'kg' },
  { codigo: 'UNIDAD', nombre: 'Unidad', abreviatura: 'u', tipo: 'unidades' },
  { codigo: 'MANOJO', nombre: 'Manojo', abreviatura: 'manojo', tipo: 'manojos' },
])
const normal = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[._-]/g, ' ').trim().replace(/\s+/g, ' ')
const aliases = {
  kg: ['kg','kgs','kilo','kilos','kilogramo','kilogramos'],
  unidades: ['u','ud','und','unid','uds','unidad','unidades','pieza','piezas'],
  manojos: ['manojo','manojos'],
}
export function tipoDeUnidad(u) {
  const tipos = new Set([u.codigo, u.nombre, u.abreviatura].map(normal)
    .map(v => Object.entries(aliases).find(([, names]) => names.includes(v))?.[0])
    .filter(Boolean))
  return tipos.size === 1 ? [...tipos][0] : null
}
export function planUnidades(snapshot) {
  const reales = snapshot.filter(u => !/^SYN-/i.test(String(u.codigo)))
  const filas = UNIDADES_COSECHA.map(referencia => {
    const relacionados = reales.filter(u => tipoDeUnidad(u) === referencia.tipo || normal(u.codigo) === normal(referencia.codigo))
    if (relacionados.length > 1) return { ...referencia, accion: 'REVISAR_DUPLICADOS', ids: relacionados.map(u => u.id) }
    if (!relacionados.length) return { ...referencia, accion: 'CREAR' }
    const actual = relacionados[0]
    if (tipoDeUnidad(actual) !== referencia.tipo) return { ...referencia, accion: 'REVISAR_INCONSISTENTE', id: actual.id }
    if (!actual.activo) return { ...referencia, accion: 'REVISAR_INACTIVO', id: actual.id }
    return { ...referencia, accion: 'EXISTE', id: actual.id, codigoExistente: actual.codigo }
  })
  return { filas, resumen: { crear: filas.filter(f => f.accion === 'CREAR').length,
    existentes: filas.filter(f => f.accion === 'EXISTE').length,
    revisar: filas.filter(f => f.accion.startsWith('REVISAR')).length } }
}
