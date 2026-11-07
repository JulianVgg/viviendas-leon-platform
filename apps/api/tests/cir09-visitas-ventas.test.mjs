import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validarMovimientoVisita } from '../dist/modules/visits/visit-economics.js'

const cosecha = { fechaCosecha: '2026-11-06', cantidad: '12.500', unidadMedidaId: 3 }
const venta = { fechaVenta: '2026-11-06', cantidad: '5.000', unidadMedidaId: 3,
  monedaId: 1, precioUnitario: '12.5000', observaciones: null }

test('acepta cosecha nueva vinculada al ciclo sin venta', () => {
  assert.deepEqual(validarMovimientoVisita({ cosecha }, 7), { cosecha })
})
test('acepta nueva cosecha y venta sin ID de producción inventado', () => {
  assert.deepEqual(validarMovimientoVisita({ cosecha, venta }, 7), { cosecha, venta })
})
test('acepta venta vinculada a cosecha previa por ID', () => {
  assert.deepEqual(validarMovimientoVisita({ venta: { ...venta, registroProduccionId: 9 } }, 7),
    { venta: { ...venta, registroProduccionId: 9 } })
})
test('rechaza venta sin cosecha ni ID de producción', () => {
  assert.equal(validarMovimientoVisita({ venta }, 7), null)
})
test('rechaza cosecha nueva con ID de producción de otra cosecha', () => {
  assert.equal(validarMovimientoVisita({ cosecha, venta: { ...venta, registroProduccionId: 9 } }, 7), null)
})
test('rechaza monto o cantidad negativos', () => {
  assert.equal(validarMovimientoVisita({ cosecha, venta: { ...venta, precioUnitario: '-3' } }, 7), null)
  assert.equal(validarMovimientoVisita({ cosecha: { ...cosecha, cantidad: '-2' } }, 7), null)
})
test('rechaza importes sin moneda y fechas inválidas', () => {
  assert.equal(validarMovimientoVisita({ cosecha, venta: { ...venta, monedaId: 0 } }, 7), null)
  assert.equal(validarMovimientoVisita({ cosecha: { ...cosecha, fechaCosecha: '2026-02-30' } }, 7), null)
})
test('rechaza campos no permitidos', () => {
  assert.equal(validarMovimientoVisita({ cosecha, extra: 'valor arbitrario' }, 7), null)
  assert.equal(validarMovimientoVisita({ cosecha: { ...cosecha, observaciones: 'no permitido' } }, 7), null)
})
