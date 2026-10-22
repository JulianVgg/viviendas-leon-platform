import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCropId, validateCropInput } from '../dist/modules/agriculture/crops.validation.js'

test('AGR-02: valida un cultivo activo e higieniza el nombre', () => {
  const result = validateCropInput({ nombre: '  Tomate   cherry  ', descripcion: ' Hortaliza ', activo: true })
  assert.deepEqual(result.data, { nombre: 'Tomate cherry', descripcion: 'Hortaliza', activo: true })
  assert.deepEqual(result.details, [])
})

test('AGR-02: exige nombre y permite desactivar', () => {
  assert.ok(validateCropInput({ nombre: '   ', activo: true }).details.some((d) => d.field === 'nombre'))
  assert.equal(validateCropInput({ nombre: 'Tomate', activo: false }).data?.activo, false)
})

test('AGR-02: rechaza datos adicionales y tipos erróneos', () => {
  const result = validateCropInput({ nombre: 'Tomate', activo: 'false', id: 99 })
  assert.deepEqual(result.details.map((d) => d.field).sort(), ['activo', 'id'])
  assert.equal(result.data, undefined)
})

test('AGR-02: rechaza IDs fuera de rango', () => {
  assert.equal(parseCropId('1'), 1)
  for (const id of ['0', '-1', '1.0', '2147483648', 'abc', null]) assert.equal(parseCropId(id), null)
})
