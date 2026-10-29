import test from 'node:test'
import assert from 'node:assert/strict'
import { productionEstimate, estimatedSaleQ } from '../src/features/visits/services/visitProduction.ts'

const sample = { plants: '3', perPlantUnits: '4', perPlantKg: '1.5', priceBasis: 'unidad', priceQ: '5' }

test('producción por planta calcula valores estimados sin pedir total duplicado', () => {
  assert.deepEqual(productionEstimate(sample), { units: 12, kg: 4.5 })
})
test('venta usa únicamente unidad o kg según base de precio', () => {
  assert.equal(estimatedSaleQ(sample), 60)
  assert.equal(estimatedSaleQ({ ...sample, priceBasis: 'kg' }), 22.5)
})
test('sin plantas observadas no inventa producción ni ingresos', () => {
  assert.deepEqual(productionEstimate({ ...sample, plants: '' }), { units: null, kg: null })
  assert.equal(estimatedSaleQ({ ...sample, plants: '' }), null)
})
test('precio sin cantidad de la unidad seleccionada no estima ventas', () => {
  assert.equal(estimatedSaleQ({ ...sample, perPlantKg: '', priceBasis: 'kg' }), null)
})
