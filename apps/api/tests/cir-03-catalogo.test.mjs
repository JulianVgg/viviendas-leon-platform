import test from 'node:test'
import assert from 'node:assert/strict'
import { CULTIVOS_OFICIALES, claveCultivo, planCatalogo } from '../scripts/cir-03-catalogo-lib.mjs'

const cultivo = (id, nombre, activo = true) => ({ id, nombre, activo })

test('CIR-03: lista institucional de 22 variedades sin duplicados', () => {
  assert.equal(CULTIVOS_OFICIALES.length, 22)
  assert.equal(new Set(CULTIVOS_OFICIALES.map(claveCultivo)).size, 22)
  assert.ok(CULTIVOS_OFICIALES.includes('Chile jalapeño'))
  assert.ok(CULTIVOS_OFICIALES.includes('Flor de muerto'))
})

test('CIR-03: diferencia variedades de frijol', () => {
  assert.notEqual(claveCultivo('Frijol'), claveCultivo('Frijol bolonillo'))
  assert.notEqual(claveCultivo('Chile pimiento'), claveCultivo('Chile jalapeño'))
})

test('CIR-03: detecta variaciones ortográficas', () => {
  assert.equal(claveCultivo('  BROCOLI '), claveCultivo('Brócoli'))
  assert.equal(claveCultivo('chile-jalapeno'), claveCultivo('Chile jalapeño'))
})

test('CIR-03: catálogo vacío plantea crear las 22 variedades', () => {
  const plan = planCatalogo([])
  assert.deepEqual(plan.resumen, { oficiales: 22, crear: 22, normalizar: 0, existentes: 0, revisar: 0 })
})

test('CIR-03: reconoce existentes sin duplicarlos', () => {
  const plan = planCatalogo([cultivo(7, 'Tomate'), cultivo(8, 'Frijol')])
  assert.equal(plan.resumen.crear, 20)
  assert.equal(plan.resumen.existentes, 2)
})

test('CIR-03: normaliza un nombre conservando su ID', () => {
  const plan = planCatalogo([cultivo(35, 'Brocoli')])
  assert.deepEqual(plan.filas.find(x => x.nombre === 'Brócoli'),
    { nombre: 'Brócoli', accion: 'NORMALIZAR', id: 35, anterior: 'Brocoli' })
})

test('CIR-03: bloquea nombres equivalentes duplicados', () => {
  const plan = planCatalogo([cultivo(1, 'Brócoli'), cultivo(2, 'Brocoli')])
  assert.equal(plan.filas.find(x => x.nombre === 'Brócoli').accion, 'REVISAR_DUPLICADOS')
  assert.equal(plan.resumen.revisar, 1)
})

test('CIR-03: no reactiva un cultivo sin revisión', () => {
  const plan = planCatalogo([cultivo(1, 'Tomate', false)])
  assert.equal(plan.filas.find(x => x.nombre === 'Tomate').accion, 'REVISAR_INACTIVO')
})

test('CIR-03: conserva los registros sintéticos y no los asume oficiales', () => {
  const plan = planCatalogo([cultivo(1, 'Cultivo Sintético Tomate'), cultivo(2, 'Frijol bolonillo')])
  assert.equal(plan.resumen.crear, 22)
})

test('CIR-03: la segunda simulación es idempotente', () => {
  const items = CULTIVOS_OFICIALES.map((nombre, index) => cultivo(index + 1, nombre))
  const plan = planCatalogo(items)
  assert.deepEqual(plan.resumen, { oficiales: 22, crear: 0, normalizar: 0, existentes: 22, revisar: 0 })
})
