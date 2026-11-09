import test from 'node:test'
import assert from 'node:assert/strict'
import { esInsumoFicticio, tipoAbonoCategoria } from '../src/features/agriculture/services/abonosCatalog.ts'

test('CIR-17: clasifica correctamente los tipos de abono', () => {
  assert.equal(tipoAbonoCategoria('Abonos orgánicos'), 'organico')
  assert.equal(tipoAbonoCategoria('Abonos inorgánicos'), 'inorganico')
  assert.equal(tipoAbonoCategoria('Preparados líquidos orgánicos'), 'organico')
  assert.equal(tipoAbonoCategoria('Microorganismos benéficos'), 'organico')
  assert.equal(tipoAbonoCategoria('Insecticidas orgánicos'), null)
  assert.equal(tipoAbonoCategoria('Fungicidas orgánicos'), null)
})

test('CIR-17: separa únicamente registros de demostración señalados', () => {
  assert.equal(esInsumoFicticio({ nombre: 'Insumo Sintético BioControl', descripcion: 'Insumo ficticio.' }), true)
  assert.equal(esInsumoFicticio({ nombre: 'Lombricompost', descripcion: null }), false)
  assert.equal(esInsumoFicticio({ nombre: 'Insumo sintético comercial', descripcion: 'Uso verificado.' }), false)
})
