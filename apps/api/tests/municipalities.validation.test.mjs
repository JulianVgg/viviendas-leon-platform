import assert from 'node:assert/strict'
import test from 'node:test'
import { parseMunicipalityId, validateMunicipalityInput, validateMunicipalityState } from '../dist/modules/catalogs/municipalities.validation.js'

test('valida los nombres de municipios y normaliza espacios', () => {
  const output = validateMunicipalityInput({ nombre: '  Santa   Lucía   Utatlán  ' })
  assert.deepEqual(output.data, { nombre: 'Santa Lucía Utatlán' })
  assert.deepEqual(output.details, [])
})

test('rechaza campos no permitidos, nombre vacío o caracteres de control', () => {
  for (const input of [{ nombre: '  ' }, { nombre: 'x', id: 1 }, { nombre: 'A\nB' }, { nombre: 'n'.repeat(121) }, null]) {
    assert.equal(validateMunicipalityInput(input).data, undefined)
  }
})

test('valida exclusivamente un booleano para cambiar el estado', () => {
  assert.deepEqual(validateMunicipalityState({ activo: false }).data, { activo: false })
  assert.deepEqual(validateMunicipalityState({ activo: true }).data, { activo: true })
  assert.equal(validateMunicipalityState({ activo: 'false' }).data, undefined)
  assert.equal(validateMunicipalityState({ activo: true, id: 3 }).data, undefined)
})

test('identificadores de municipio deben ser enteros positivos de PostgreSQL', () => {
  assert.equal(parseMunicipalityId('42'), 42)
  for (const value of ['0', '-5', '2.5', 'foo', '2147483648', 42]) assert.equal(parseMunicipalityId(value), null)
})
