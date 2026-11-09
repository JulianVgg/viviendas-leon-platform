import test from 'node:test'
import assert from 'node:assert/strict'
import { tratamientosPorVisita } from '../src/modules/visits/visit-treatment-history.ts'

test('CIR-18: agrupa los tratamientos por visita y ciclo sin mezclar familias', () => {
  const records = [
    { evaluacionCultivo: { visitaId: 10, cicloCultivoId: 5 }, insumoId: 2, insumo: { nombre: 'Bocashi', categoriaInsumo: { nombre: 'Abonos orgánicos' } }, fechaAplicacion: new Date('2026-11-09T12:00:00Z'), cantidad: null, unidadMedida: null, observaciones: null },
    { evaluacionCultivo: { visitaId: 11, cicloCultivoId: 7 }, insumoId: 8, insumo: { nombre: 'Ajo', categoriaInsumo: { nombre: 'Insecticidas orgánicos' } }, fechaAplicacion: null, cantidad: { toString: () => '1.5' }, unidadMedida: { abreviatura: 'L', nombre: 'Litro' }, observaciones: 'Aplicación foliar' },
  ]
  const mapped = tratamientosPorVisita(records)
  assert.equal(mapped.get(10)?.length, 1)
  assert.equal(mapped.get(11)?.length, 1)
  assert.deepEqual(mapped.get(10)?.[0], { cicloCultivoId: 5, insumoId: 2, nombre: 'Bocashi', categoria: 'Abonos orgánicos', fecha: '2026-11-09', cantidad: null, unidad: null, observaciones: null })
  assert.equal(mapped.get(11)?.[0].cantidad, '1.5')
  assert.equal(mapped.get(11)?.[0].unidad, 'L')
  assert.equal(mapped.get(11)?.[0].observaciones, 'Aplicación foliar')
  assert.equal(mapped.has(12), false)
})
