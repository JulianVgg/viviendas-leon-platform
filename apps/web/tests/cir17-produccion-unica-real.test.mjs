import test from 'node:test'
import assert from 'node:assert/strict'
import { registroIniciado, validarProduccion, totalProduccion, movimientoProduccion } from '../src/features/visits/services/visitConfirmedProduction.ts'

const params = { fecha: '2026-11-09', unidadId: 2, kgId: 1, monedaId: 5 }
const registro = { plantasVendidas: '20', perPlantUnits: '3', perPlantKg: '1.25', priceBasis: 'unidad', priceQ: '5' }

test('CIR-17: un solo formulario reconoce si se ingresó producción', () => {
  assert.equal(registroIniciado({ ...registro, plantasVendidas: '', perPlantUnits: '', perPlantKg: '', priceQ: '' }), false)
  assert.equal(registroIniciado(registro), true)
})
test('CIR-17: calcula ingreso por unidades sin sumar adicionalmente kg', () => {
  assert.equal(validarProduccion(registro), null)
  assert.equal(totalProduccion(registro), 300)
  const movement = movimientoProduccion(registro, params)
  assert.equal(movement.cosecha.cantidad, '60')
  assert.deepEqual(movement.cosecha.detalleAdicional, { cantidad: '25', unidadMedidaId: 1 })
  assert.equal(movement.venta.cantidad, '60')
  assert.equal(movement.venta.monedaId, 5)
})
test('CIR-17: precio por kilogramo calcula solo kg', () => {
  const actual = { ...registro, priceBasis: 'kg' }
  assert.equal(totalProduccion(actual), 125)
  const movement = movimientoProduccion(actual, params)
  assert.equal(movement.cosecha.unidadMedidaId, 1)
  assert.equal(movement.cosecha.cantidad, '25')
  assert.equal(movement.venta.cantidad, '25')
  assert.equal(movement.cosecha.detalleAdicional.cantidad, '60')
})
test('CIR-17: no genera movimiento con campos vacíos', () => {
  assert.equal(movimientoProduccion({ ...registro, plantasVendidas: '', perPlantUnits: '', perPlantKg: '', priceQ: '' }, params), undefined)
})
test('CIR-17: no acepta unidades fraccionarias', () => {
  const invalid = { ...registro, plantasVendidas: '3', perPlantUnits: '0.5' }
  assert.match(validarProduccion(invalid), /entero/)
})
test('CIR-17: no inventa cantidad ni valor ante falta de datos', () => {
  assert.match(validarProduccion({ ...registro, priceQ: '' }), /precio/)
  assert.match(validarProduccion({ ...registro, plantasVendidas: '' }), /plantas/)
  assert.equal(totalProduccion({ ...registro, plantasVendidas: '' }), null)
})
test('CIR-17: exige catálogo de moneda y unidad oficial', () => {
  assert.throws(() => movimientoProduccion(registro, { ...params, monedaId: 0 }), /moneda/)
})

test('CIR-17: sin campo duplicado, plantas vendidas equivalen a unidades al elegir precio por unidad', () => {
  const compacto = { ...registro, perPlantUnits: '' }
  assert.equal(validarProduccion(compacto), null)
  assert.equal(totalProduccion(compacto), 100)
  const movement = movimientoProduccion(compacto, params)
  assert.equal(movement.venta.cantidad, '20')
  assert.deepEqual(movement.cosecha.detalleAdicional, { cantidad: '25', unidadMedidaId: 1 })
})

test('CIR-17: conserva la multiplicación por kilogramos sin duplicar el importe', () => {
  const compacto = { ...registro, perPlantUnits: '', priceBasis: 'kg' }
  assert.equal(totalProduccion(compacto), 125)
  const movement = movimientoProduccion(compacto, params)
  assert.equal(movement.venta.cantidad, '25')
  assert.equal(movement.cosecha.detalleAdicional.cantidad, '20')
})
