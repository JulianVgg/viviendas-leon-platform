import test from 'node:test'
import assert from 'node:assert/strict'
import { estimatedSaleQ, productionEstimate } from '../src/features/visits/services/visitProduction.ts'

test('CIR17: calcula automáticamente volumen y valor según plantas y unidades', () => {
  const row = { plants: '20', perPlantUnits: '2', perPlantKg: '1.5', priceBasis: 'unidad', priceQ: '3.25' }
  assert.deepEqual(productionEstimate(row), { units: 40, kg: 30 })
  assert.equal(estimatedSaleQ(row), 130)
})

test('CIR17: cambia el cálculo cuando se seleccionan kilogramos', () => {
  const row = { plants: '20', perPlantUnits: '2', perPlantKg: '1.5', priceBasis: 'kg', priceQ: '3.25' }
  assert.equal(estimatedSaleQ(row), 97.5)
})

test('CIR17: no inventa valor si faltan plantas o unidades', () => {
  assert.equal(estimatedSaleQ({ plants: '', perPlantUnits: '2', perPlantKg: '1.5', priceBasis: 'unidad', priceQ: '3.25' }), null)
})
