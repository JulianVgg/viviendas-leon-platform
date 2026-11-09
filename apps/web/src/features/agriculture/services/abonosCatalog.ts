/** Vista especializada sobre Insumo/CategoriaInsumo; no crea un catálogo duplicado. */
export type TipoAbono = 'organico' | 'inorganico'

export const normalizarCategoria = (nombre: string) => nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

export function tipoAbonoCategoria(nombre: string): TipoAbono | null {
  const key = normalizarCategoria(nombre)
  if (key === 'abonos inorganicos') return 'inorganico'
  if (key === 'abonos organicos' || key === 'preparados liquidos organicos' || key === 'microorganismos beneficos') return 'organico'
  return null
}

export function esInsumoFicticio(insumo: { nombre: string; descripcion: string | null }): boolean {
  return /^insumo sint[eé]tico\b/i.test(insumo.nombre) && /^insumo ficticio\.?$/i.test(insumo.descripcion?.trim() ?? '')
}
