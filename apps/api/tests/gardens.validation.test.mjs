import test from 'node:test'
import assert from 'node:assert/strict'
import { validateGardenInput, parseGardenId } from '../dist/modules/agriculture/gardens.validation.js'

const good = { familiaId: 1, estado: 'ACTIVO', nombre: 'Huerto norte', tipo: 'FAMILIAR', fechaInicio: '2026-10-21', observaciones: 'Macrotúnel' }

test('AGR-01 accepts the Prisma-required fields and optional fields', () => {
  assert.deepEqual(validateGardenInput({ familiaId: 1, estado: 'ACTIVO' }).details, [])
  assert.equal(validateGardenInput(good).data.nombre, 'Huerto norte')
})

test('AGR-01 rejects nonexistent/invalid relationship identifiers', () => {
  for (const bad of [0, -1, '1', 1.1, 2147483648]) {
    assert.equal(validateGardenInput({ ...good, familiaId: bad }).data, null)
  }
  assert.equal(parseGardenId('01'), null)
  assert.equal(parseGardenId('2147483648'), null)
  assert.equal(parseGardenId('15'), 15)
})

test('AGR-01 rejects invalid dates and statuses', () => {
  assert.equal(validateGardenInput({ ...good, fechaInicio: '2026-02-30' }).data, null)
  assert.equal(validateGardenInput({ ...good, estado: 'NO_VALIDO' }).data, null)
  assert.equal(validateGardenInput({ ...good, tipo: 'OTRO' }).data, null)
})

test('AGR-01 trims inputs and applies length limits', () => {
  assert.equal(validateGardenInput({ ...good, nombre: '  Jardín  ' }).data.nombre, 'Jardín')
  assert.equal(validateGardenInput({ ...good, nombre: 'x'.repeat(121) }).data, null)
  assert.equal(validateGardenInput({ ...good, observaciones: 'y'.repeat(2001) }).data, null)
})
