import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateCoordinates } from '../dist/modules/families/family-coordinates.rules.js'
import { validateFamilyUpdate } from '../dist/modules/families/families-management.validation.js'

const ok = (data) => assert.deepEqual(validateCoordinates(data).details, [])
test('CIR-07 valida parejas de coordenadas y valores límite', () => {
  ok({ latitud: 14.5, longitud: -90.5 })
  ok({ latitud: -90, longitud: 180 })
  ok({ latitud: null, longitud: null })
  assert.equal(validateCoordinates({}).included, false)
  assert.equal(validateCoordinates({ latitud: 14 }).details.length, 1)
  assert.equal(validateCoordinates({ latitud: null, longitud: 0 }).details.length, 1)
  assert.equal(validateCoordinates({ latitud: '14.80', longitud: -91 }).details[0].field, 'latitud')
  assert.equal(validateCoordinates({ latitud: 91, longitud: -91 }).details[0].field, 'latitud')
  assert.equal(validateCoordinates({ latitud: 14, longitud: Infinity }).details[0].field, 'longitud')
})
test('CIR-07 permite borrar ambas coordenadas o actualizar pareja en PATCH', () => {
  const valid = validateFamilyUpdate({ version: '1', latitud: 14.5, longitud: -90.5 })
  assert.equal(valid.details.length, 0)
  assert.equal(valid.data.latitud, 14.5)
  const blank = validateFamilyUpdate({ version: '1', latitud: null, longitud: null })
  assert.equal(blank.details.length, 0)
  assert.equal(blank.data.longitud, null)
  assert.equal(validateFamilyUpdate({ version: '1', latitud: 14.8 }).data, undefined)
})
