import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readLocationsCsv, locationPlan } from '../scripts/cir-07-ubicaciones-lib.mjs'
const rows = Array.from({ length: 19 }, (_, i) => `Persona ${i+1},Comunidad,14.800000,-91.260000`).join('\n')
test('CIR-07 parser valida 19 ubicaciones, nombres y rango geográfico', () => {
  const csv = `nombre,comunidad,latitud,longitud\n${rows}`
  const items = readLocationsCsv(csv)
  assert.equal(items.length, 19)
  assert.throws(() => readLocationsCsv(csv.replace('14.800000','91.800000')), /fuera del rango/)
  assert.throws(() => readLocationsCsv(csv.replace('Persona 2','Persona 1')), /duplicados/)
})
test('CIR-07 no actualiza ubicación existente ni admite identidad ambigua', () => {
  const items = [{ nombre: 'Ana', comunidad: 'Paxub’', latitud: 14.8, longitud: -91.26, fila: 2 }]
  const base = { id: 5, nombreReferencia: 'Ana', comunidad: 'Paxub', municipio: 'Santa Lucia Utatlan', latitud: null, longitud: null }
  assert.equal(locationPlan(items, [base]).summary.actualizar, 1)
  assert.equal(locationPlan(items, [{ ...base, latitud:14.8, longitud:-91.26 }]).summary.existentes, 1)
  assert.equal(locationPlan(items, [{ ...base, latitud:14.9, longitud:-91.26 }]).summary.revisar, 1)
  assert.equal(locationPlan(items, [base,{...base,id:6}]).summary.revisar, 1)
  assert.equal(locationPlan(items, [{...base, municipio:'Otro'}]).summary.revisar, 1)
})
