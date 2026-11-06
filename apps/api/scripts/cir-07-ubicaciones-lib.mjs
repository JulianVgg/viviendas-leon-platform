// CIR-07: no contiene datos personales ni coordenadas reales.
import { normalizeText } from './cir-02-audit-lib.mjs'

export const MUNICIPIO_OFICIAL = 'Santa Lucía Utatlán'
const key = (nombre, comunidad) => `${normalizeText(nombre)}|${normalizeText(comunidad)}`

export function readLocationsCsv(text) {
  const lines = String(text).replace(/^\uFEFF/, '').trim().split(/\r?\n/)
  if (lines.shift()?.trim().toLowerCase() !== 'nombre,comunidad,latitud,longitud') throw new Error('Se requieren columnas nombre,comunidad,latitud,longitud.')
  const items = lines.map((line, index) => {
    const fields = line.split(',').map((value) => value.trim())
    if (fields.length !== 4 || !fields[0] || !fields[1]) throw new Error(`Fila ${index + 2}: formato inválido.`)
    // Validar el rango geográfico del padrón del municipio, además de los límites mundiales.
    if (!/^-?\d+(?:\.\d{1,6})?$/.test(fields[2]) || !/^-?\d+(?:\.\d{1,6})?$/.test(fields[3])) throw new Error(`Fila ${index + 2}: coordenadas inválidas.`)
    const latitud = Number(fields[2]), longitud = Number(fields[3])
    if (latitud < 13 || latitud > 18 || longitud < -93 || longitud > -88) throw new Error(`Fila ${index + 2}: coordenadas fuera del rango de Guatemala; verificar manualmente.`)
    return { nombre: fields[0], comunidad: fields[1], latitud, longitud, fila: index + 2 }
  })
  if (items.length !== 19) throw new Error(`Se esperaban 19 ubicaciones, se encontraron ${items.length}.`)
  if (new Set(items.map((v) => key(v.nombre,v.comunidad))).size !== items.length) throw new Error('Hay nombres/comunidades duplicados en el CSV.')
  return items
}

export function locationPlan(items, families) {
  let actualizar = 0, existentes = 0, revisar = 0
  const tasks = []
  for (const item of items) {
    const matching = families.filter((family) => key(family.nombreReferencia, family.comunidad) === key(item.nombre, item.comunidad)
      && normalizeText(family.municipio) === normalizeText(MUNICIPIO_OFICIAL))
    let status, id = null
    if (matching.length !== 1) { status = 'REVISAR_IDENTIDAD'; revisar++ }
    else {
      const family = matching[0]; id = family.id
      if (family.latitud == null && family.longitud == null) { status = 'ACTUALIZAR'; actualizar++ }
      else if (typeof family.latitud === 'number' && typeof family.longitud === 'number'
        && Math.abs(family.latitud - item.latitud) < 0.0000001 && Math.abs(family.longitud - item.longitud) < 0.0000001) { status = 'EXISTE'; existentes++ }
      else { status = 'REVISAR_COORDENADAS'; revisar++ }
    }
    tasks.push({ ...item, id, status })
  }
  return { tasks, summary: { total: items.length, actualizar, existentes, revisar } }
}
