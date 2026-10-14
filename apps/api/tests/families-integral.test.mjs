import assert from 'node:assert/strict'
import { test } from 'node:test'
import { once } from 'node:events'
import { validateIntegralFamilyInput } from '../dist/modules/families/families-integral.validation.js'
import { app } from '../dist/app.js'
import { createIntegralFamily, IntegralFamilyValidationError } from '../dist/modules/families/families-integral.service.js'

const valid = () => ({ nombreReferencia: ' QA FAMILY ', comunidadId: 1, integrantes: [{ nombreCompleto: ' QA PERSON ' }], programas: [{ programaId: 1 }] })

test('normalizes optional values without inventing participation states', () => {
  const body = valid()
  body.integrantes[0].telefono = '  '
  body.programas[0].estado = ' HISTORICAL CUSTOM STATE '
  const result = validateIntegralFamilyInput(body)
  assert.deepEqual(result.details, [])
  assert.equal(result.data.nombreReferencia, 'QA FAMILY')
  assert.equal(result.data.integrantes[0].nombreCompleto, 'QA PERSON')
  assert.equal(result.data.integrantes[0].telefono, null)
  assert.equal(result.data.programas[0].estado, 'HISTORICAL CUSTOM STATE')
  assert.equal(result.data.programas[0].fechaIngreso, null)
})

const cases = [
  ['missing members', (b) => { delete b.integrantes }, 'integrantes'],
  ['empty members', (b) => { b.integrantes = [] }, 'integrantes'],
  ['wrong members type', (b) => { b.integrantes = {} }, 'integrantes'],
  ['missing programs', (b) => { delete b.programas }, 'programas'],
  ['empty programs', (b) => { b.programas = [] }, 'programas'],
  ['wrong programs type', (b) => { b.programas = '1' }, 'programas'],
  ['blank member name', (b) => { b.integrantes[0].nombreCompleto = ' ' }, 'integrantes[0].nombreCompleto'],
  ['numeric member name', (b) => { b.integrantes[0].nombreCompleto = 123 }, 'integrantes[0].nombreCompleto'],
  ['unknown family field', (b) => { b.estado = 'ACTIVA' }, 'estado'],
  ['member family id', (b) => { b.integrantes[0].familiaId = 1 }, 'integrantes[0].familiaId'],
  ['member active field', (b) => { b.integrantes[0].activo = false }, 'integrantes[0].activo'],
  ['program family id', (b) => { b.programas[0].familiaId = 1 }, 'programas[0].familiaId'],
  ['duplicate program', (b) => { b.programas.push({ programaId: 1 }) }, 'programas[1].programaId'],
  ['numeric string program', (b) => { b.programas[0].programaId = '1' }, 'programas[0].programaId'],
  ['zero program', (b) => { b.programas[0].programaId = 0 }, 'programas[0].programaId'],
  ['fractional program', (b) => { b.programas[0].programaId = 1.1 }, 'programas[0].programaId'],
  ['overflow program', (b) => { b.programas[0].programaId = 2147483648 }, 'programas[0].programaId'],
  ['wrong community type', (b) => { b.comunidadId = '1' }, 'comunidadId'],
  ['blank reference', (b) => { b.nombreReferencia = ' ' }, 'nombreReferencia'],
  ['long reference', (b) => { b.nombreReferencia = 'x'.repeat(151) }, 'nombreReferencia'],
  ['long observations', (b) => { b.observaciones = 'x'.repeat(2001) }, 'observaciones'],
  ['invalid family date', (b) => { b.fechaIngreso = '2026-02-30' }, 'fechaIngreso'],
  ['invalid birth date', (b) => { b.integrantes[0].fechaNacimiento = '2025-02-29' }, 'integrantes[0].fechaNacimiento'],
  ['year zero', (b) => { b.integrantes[0].fechaNacimiento = '0000-01-01' }, 'integrantes[0].fechaNacimiento'],
  ['timestamp instead of date', (b) => { b.programas[0].fechaIngreso = '2026-10-13T00:00:00Z' }, 'programas[0].fechaIngreso'],
  ['numeric exit date', (b) => { b.programas[0].fechaSalida = 123 }, 'programas[0].fechaSalida'],
  ['reversed dates', (b) => { b.programas[0].fechaIngreso = '2026-10-13'; b.programas[0].fechaSalida = '2026-10-12' }, 'programas[0].fechaSalida'],
  ...['sexo', 'parentesco', 'telefono', 'observaciones'].map((key) => [`wrong member ${key}`, (b) => { b.integrantes[0][key] = false }, `integrantes[0].${key}`]),
  ...['estado', 'observaciones'].map((key) => [`wrong program ${key}`, (b) => { b.programas[0][key] = {} }, `programas[0].${key}`]),
  ['null member', (b) => { b.integrantes = [null] }, 'integrantes[0]'],
  ['array program', (b) => { b.programas = [[]] }, 'programas[0]'],
]
for (const [name, change, field] of cases) test(name, () => {
  const body = valid()
  change(body)
  const result = validateIntegralFamilyInput(body)
  assert.equal(result.data, undefined)
  assert.ok(result.details.some((detail) => detail.field === field))
})

test('accepts real leap dates and optional nulls', () => {
  const body = valid()
  body.integrantes[0].fechaNacimiento = '2000-02-29'
  body.fechaIngreso = null
  assert.equal(validateIntegralFamilyInput(body).data.integrantes[0].fechaNacimiento.toISOString(), '2000-02-29T00:00:00.000Z')
})

test('rejects non-object bodies', () => {
  for (const body of [null, [], false, 'text', 123]) assert.equal(validateIntegralFamilyInput(body).details[0].field, 'body')
})

test('service also enforces minimum relations before accessing PostgreSQL', async () => {
  const input = validateIntegralFamilyInput(valid()).data
  for (const key of ['integrantes', 'programas']) {
    await assert.rejects(createIntegralFamily({ ...input, [key]: [] }, {}), (error) => error instanceof IntegralFamilyValidationError && error.details[0].field === key)
  }
})

test('HTTP gates fail closed and leave basic health/validation unchanged', async () => {
  const previous = { node: process.env.NODE_ENV, flag: process.env.ENABLE_FAMILY_INTEGRAL_API }
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    for (const [env, flag] of [[undefined, undefined], ['development', undefined], ['production', 'true'], ['test', 'true'], ['qa', 'false']]) {
      if (env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = env
      if (flag === undefined) delete process.env.ENABLE_FAMILY_INTEGRAL_API; else process.env.ENABLE_FAMILY_INTEGRAL_API = flag
      for (const [path, method] of [['registro-integral', 'POST'], ['opciones/programas', 'GET'], ['1/expediente', 'GET']]) {
        assert.equal((await fetch(`${base}/api/v1/familias/${path}`, { method })).status, 404)
      }
    }
    process.env.NODE_ENV = 'qa'
    process.env.ENABLE_FAMILY_INTEGRAL_API = 'true'
    const invalid = await fetch(`${base}/api/v1/familias/registro-integral`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...valid(), integrantes: [] }) })
    assert.equal(invalid.status, 400)
    assert.equal((await invalid.json()).error.details[0].field, 'integrantes')
    assert.equal((await fetch(`${base}/api/v1/familias/invalid/expediente`)).status, 400)
    assert.equal((await fetch(`${base}/api/v1/familias`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 400)
    assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { status: 'ok', service: 'viviendas-leon-api' })
  } finally {
    await new Promise((resolve) => server.close(resolve))
    if (previous.node === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous.node
    if (previous.flag === undefined) delete process.env.ENABLE_FAMILY_INTEGRAL_API; else process.env.ENABLE_FAMILY_INTEGRAL_API = previous.flag
  }
})
