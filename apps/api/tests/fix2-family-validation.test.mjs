import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateFamilyInput } from '../dist/modules/families/families.validation.js'
import { validateIntegralFamilyInput } from '../dist/modules/families/families-integral.validation.js'
import { validateMemberCreate } from '../dist/modules/families/families-management.validation.js'

const input = () => ({
  nombreReferencia: 'Familia Xitamul', comunidadId: 8, fechaIngreso: '2026-11-01', observaciones: null,
  integrantes: [{ nombreCompleto: 'María Xitamul', fechaNacimiento: '1990-01-01', sexo: 'Femenino', parentesco: 'Abuela', telefono: '+502 4000 1234', observaciones: null }],
  programas: [{ programaId: 1, fechaIngreso: null, fechaSalida: null, estado: 'ACTIVO', observaciones: null }],
})

test('API acepta payload real con rol personalizado sin migración de columna', () => {
  const result = validateIntegralFamilyInput(input())
  assert.deepEqual(result.details, [])
  assert.equal(result.data?.integrantes[0].parentesco, 'Abuela')
})

test('API rechaza nombre familiar inválido o sobrelargo', () => {
  assert.ok(validateFamilyInput({ ...input(), nombreReferencia: 'Familia 123', integrantes: undefined, programas: undefined }).details.some(({ field }) => field === 'nombreReferencia'))
  const sample = input()
  sample.nombreReferencia = 'Z'.repeat(151)
  assert.ok(validateIntegralFamilyInput(sample).details.some(({ field }) => field === 'nombreReferencia'))
})

test('API rechaza datos de integrantes incorrectos y roles no especificados', () => {
  const sample = input()
  Object.assign(sample.integrantes[0], { nombreCompleto: 'Juan11', parentesco: 'Otro', telefono: 'abc', fechaNacimiento: '2100-01-01' })
  const details = validateIntegralFamilyInput(sample).details
  for (const field of ['integrantes[0].nombreCompleto', 'integrantes[0].parentesco', 'integrantes[0].telefono', 'integrantes[0].fechaNacimiento']) assert.ok(details.some((entry) => entry.field === field), field)
})

test('API rechaza campos arbitrarios y registros incompletos', () => {
  const sample = input()
  sample.integrantes[0].extra = 4
  const unknownFieldDetails = validateIntegralFamilyInput(sample).details
  assert.ok(unknownFieldDetails.some(({ field }) => field === 'integrantes[0].extra'))
  sample.integrantes = Array.from({ length: 31 }, (_, i) => ({ ...input().integrantes[0], nombreCompleto: `Persona ${String.fromCharCode(65 + i % 26)}` }))
  const details = validateIntegralFamilyInput(sample).details
  assert.ok(details.some(({ field }) => field === 'integrantes'))
  assert.ok(validateMemberCreate({ nombreCompleto: 'Juan', sexo: 'Masculino', parentesco: 'Otro', fechaNacimiento: '2000-01-01' }).details.some(({ field }) => field === 'parentesco'))
})
