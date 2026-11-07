import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validarMovimientoParaVisita } from '../src/features/visits/services/visitEconomics.ts'

const harvest = { fechaCosecha: '2026-11-05', cantidad: '10', unidadMedidaId: 1 }
const sale = { fechaVenta: '2026-11-05', cantidad: '5', unidadMedidaId: 1, monedaId: 2,
  precioUnitario: '12.5', observaciones: null }
test('permite no capturar movimientos', () => assert.equal(validarMovimientoParaVisita(undefined, '2026-11-06'), null))
test('permite cosecha real independiente', () => assert.equal(validarMovimientoParaVisita({ cosecha: harvest }, '2026-11-06'), null))
test('permite cosecha y venta real en una visita', () => assert.equal(validarMovimientoParaVisita({ cosecha: harvest, venta: sale }, '2026-11-06'), null))
test('impide ventas mayores a la cosecha', () => assert.match(validarMovimientoParaVisita({ cosecha: harvest, venta: { ...sale, cantidad: '11' } }, '2026-11-06'), /superar/))
test('impide venta sin cosecha existente', () => assert.match(validarMovimientoParaVisita({ venta: sale }, '2026-11-06'), /cosecha existente/))
test('impide fechas futuras y venta anterior a cosecha', () => {
  assert.ok(validarMovimientoParaVisita({ cosecha: { ...harvest, fechaCosecha: '2026-12-01' } }, '2026-11-06'))
  assert.ok(validarMovimientoParaVisita({ cosecha: harvest, venta: { ...sale, fechaVenta: '2026-11-04' } }, '2026-11-06'))
})
