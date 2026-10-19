import assert from 'node:assert/strict'
import test from 'node:test'
import { parseProgramId, validateProgramInput } from '../dist/modules/catalogs/programs.validation.js'

const valid = { nombre: 'Programa de huertos', descripcion: null, fechaInicio: '2026-10-19', fechaFin: null, estado: 'ACTIVO' }

test('permite registrar un programa válido', () => {
  const result = validateProgramInput(valid)
  assert.deepEqual(result.details, [])
  assert.equal(result.data.nombre, valid.nombre)
})
test('normaliza espacios y nombre', () => {
  const result = validateProgramInput({ ...valid, nombre: '  Programa   de huertos  ' })
  assert.equal(result.data.nombre, 'Programa de huertos')
})
test('rechaza nombre vacío', () => {
  const result = validateProgramInput({ ...valid, nombre: '  ' })
  assert.equal(result.data, undefined)
  assert.ok(result.details.some((detail) => detail.field === 'nombre'))
})
test('rechaza fechas inválidas y un fin previo al inicio', () => {
  const invalid = validateProgramInput({ ...valid, fechaInicio: '2026-02-30' })
  assert.ok(invalid.details.some((detail) => detail.field === 'fechaInicio'))
  const reversed = validateProgramInput({ ...valid, fechaFin: '2026-10-18' })
  assert.ok(reversed.details.some((detail) => detail.field === 'fechaFin'))
})
test('rechaza estados y campos desconocidos', () => {
  const result = validateProgramInput({ ...valid, estado: 'BORRADO', propietario: 'user-1' })
  assert.ok(result.details.some((detail) => detail.field === 'estado'))
  assert.ok(result.details.some((detail) => detail.field === 'propietario'))
})
test('valida ID de la URL', () => {
  assert.equal(parseProgramId('22'), 22)
  assert.equal(parseProgramId('0'), null)
  assert.equal(parseProgramId('-1'), null)
  assert.equal(parseProgramId('abc'), null)
})
