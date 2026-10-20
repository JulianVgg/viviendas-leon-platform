import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateParticipationCreate, validateParticipationUpdate, validParticipationIdempotencyKey } from '../dist/modules/families/family-programs.validation.js'
import { validateIntegralFamilyInput } from '../dist/modules/families/families-integral.validation.js'

const validInput = {
  programaId: 1, estado: 'ACTIVO', fechaIngreso: '2026-10-19', fechaSalida: null, observaciones: 'Prueba',
}

test('crea participaciones con fechas y estado válidos', () => {
  const result = validateParticipationCreate(validInput)
  assert.equal(result.details.length, 0)
  assert.equal(result.data.programaId, 1)
  assert.equal(result.data.estado, 'ACTIVO')
  assert.equal(result.data.fechaIngreso.toISOString().slice(0, 10), '2026-10-19')
})

test('rechaza programa inválido, fechas imposibles y salida anterior', () => {
  assert.equal(validateParticipationCreate({ ...validInput, programaId: 0 }).data, undefined)
  assert.equal(validateParticipationCreate({ ...validInput, fechaIngreso: '2026-02-30' }).data, undefined)
  assert.ok(validateParticipationCreate({ ...validInput, fechaSalida: '2026-10-18' }).details.some((e) => e.field === 'fechaSalida'))
})

test('rechaza estados desconocidos y propiedades no autorizadas', () => {
  assert.ok(validateParticipationCreate({ ...validInput, estado: 'INACTIVO' }).details.some((e) => e.field === 'estado'))
  assert.ok(validateParticipationCreate({ ...validInput, familiaId: 10 }).details.some((e) => e.field === 'familiaId'))
})

test('PATCH exige versión y no permite cambiar el programa asociado', () => {
  assert.ok(validateParticipationUpdate({ estado: 'RETIRADO' }).details.some((e) => e.field === 'version'))
  assert.ok(validateParticipationUpdate({ version: '1', programaId: 50 }).details.some((e) => e.field === 'programaId'))
  assert.ok(validateParticipationUpdate({ version: '1' }).details.some((e) => e.field === 'body'))
  assert.equal(validateParticipationUpdate({ version: '123', estado: 'FINALIZADO', fechaSalida: '2026-10-21' }).data.estado, 'FINALIZADO')
})

test('la idempotencia utiliza UUID v4', () => {
  assert.equal(validParticipationIdempotencyKey('1c0f2a10-25df-4b90-8f47-98c77dc39a6f'), true)
  assert.equal(validParticipationIdempotencyKey('not-a-uuid'), false)
})

test('registro integral transforma estado nulo inicial y verifica estados', () => {
  const base = {
    nombreReferencia: 'Familia QA', comunidadId: 1, fechaIngreso: '2026-10-19', observaciones: null,
    integrantes: [{ nombreCompleto: 'Integrante QA', fechaNacimiento: '2000-01-01', sexo: 'Femenino', parentesco: 'Madre', telefono: null, observaciones: null }],
    programas: [{ ...validInput, estado: null }],
  }
  const active = validateIntegralFamilyInput(base)
  assert.equal(active.data?.programas[0].estado, 'ACTIVO')
  const finished = validateIntegralFamilyInput({ ...base, programas: [{ ...validInput, estado: null, fechaSalida: '2026-10-20' }] })
  assert.equal(finished.data?.programas[0].estado, 'FINALIZADO')
  const invalid = validateIntegralFamilyInput({ ...base, programas: [{ ...validInput, estado: 'DESCONOCIDO' }] })
  assert.ok(invalid.details.some((e) => e.field === 'programas[0].estado'))
})
