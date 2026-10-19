import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { once } from 'node:events'
import { randomBytes } from 'node:crypto'
import pg from 'pg'
import { validateIntegralFamilyInput } from '../dist/modules/families/families-integral.validation.js'
import { createIntegralFamily, IntegralFamilyValidationError } from '../dist/modules/families/families-integral.service.js'
import { validIdempotencyKey, validateFamilyUpdate, validateMemberCreate, validateMemberState, validateMemberUpdate } from '../dist/modules/families/families-management.validation.js'
import { createFamilyPermissionGuard, FAMILY_WRITE_PERMISSION } from '../dist/modules/families/families.authorization.js'

// Test-process configuration BEFORE importing the app: never inherit a real DB.
// No .env loader, no production defaults, and no PostgreSQL connections allowed.
process.env.DATABASE_URL = 'postgresql://unit_test:unused@127.0.0.1:1/unit_test'
process.env.SESSION_SECRET = randomBytes(48).toString('hex')
process.env.NODE_ENV = 'test'
let databaseConnectionAttempts = 0
const originalPoolConnect = pg.Pool.prototype.connect
const originalClientConnect = pg.Client.prototype.connect
const denyDatabaseConnection = () => {
  databaseConnectionAttempts++
  throw new Error('Unit tests must not connect to PostgreSQL')
}
pg.Pool.prototype.connect = denyDatabaseConnection
pg.Client.prototype.connect = denyDatabaseConnection
const { app } = await import('../dist/app.js')
after(() => {
  pg.Pool.prototype.connect = originalPoolConnect
  pg.Client.prototype.connect = originalClientConnect
  assert.equal(databaseConnectionAttempts, 0, 'Unit suite unexpectedly attempted database access')
})

const valid = () => ({ nombreReferencia: ' QA FAMILY ', comunidadId: 1, integrantes: [{ nombreCompleto: ' QA PERSON ' }], programas: [{ programaId: 1 }] })

test('normalizes optional values and assigns an explicit participation status', () => {
  const body = valid()
  body.integrantes[0].telefono = '  '
  const result = validateIntegralFamilyInput(body)
  assert.deepEqual(result.details, [])
  assert.equal(result.data.nombreReferencia, 'QA FAMILY')
  assert.equal(result.data.integrantes[0].nombreCompleto, 'QA PERSON')
  assert.equal(result.data.integrantes[0].telefono, null)
  assert.equal(result.data.programas[0].estado, 'ACTIVO')
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

test('family update distinguishes absent fields, null values and forbidden fields', () => {
  const validUpdate = validateFamilyUpdate({ version: '123', observaciones: null, fechaIngreso: null })
  assert.deepEqual(validUpdate.details, [])
  assert.equal(validUpdate.data.observaciones, null)
  assert.equal(validUpdate.data.fechaIngreso, null)
  for (const body of [{ version: '123' }, { version: '123', estado: 'RETIRADA' }, { version: 'bad', nombreReferencia: 'Familia' }]) {
    assert.equal(validateFamilyUpdate(body).data, undefined)
  }
})

test('member management validates create, partial update and state-only contracts', () => {
  const create = validateMemberCreate({ nombreCompleto: ' Persona ', fechaNacimiento: '2000-02-29', sexo: 'Femenino', parentesco: 'Madre', telefono: null, observaciones: '' })
  assert.deepEqual(create.details, [])
  assert.equal(create.data.nombreCompleto, 'Persona')
  assert.equal(create.data.observaciones, null)
  assert.equal(validateMemberCreate({ ...create, familiaId: 1 }).data, undefined)
  assert.deepEqual(validateMemberUpdate({ version: '5', telefono: null }).details, [])
  assert.equal(validateMemberUpdate({ version: '5', activo: false }).data, undefined)
  assert.deepEqual(validateMemberState({ version: '8', activo: false }).details, [])
  assert.equal(validateMemberState({ version: '8', activo: false, observaciones: 'x' }).data, undefined)
})

test('idempotency keys require UUID v4', () => {
  assert.equal(validIdempotencyKey('123e4567-e89b-42d3-a456-426614174000'), true)
  assert.equal(validIdempotencyKey('123e4567-e89b-12d3-a456-426614174000'), false)
})

test('family permission guard allows persisted write permission and Dirección general, and denies read-only users', async () => {
  const invoke = async (permissions, roles = []) => {
    let status
    let payload
    let continued = false
    const guard = createFamilyPermissionGuard([FAMILY_WRITE_PERMISSION], 'Denied', async () => ({ id: 7, nombre: 'Synthetic', correo: 'synthetic@example.invalid', roles, permisos: permissions }))
    await guard({ session: { userId: 7 } }, { status(value) { status = value; return this }, json(value) { payload = value; return this } }, () => { continued = true })
    return { status, payload, continued }
  }
  assert.deepEqual(await invoke(['SYN-FAMILIAS-READ']), { status: 403, payload: { error: { code: 'FORBIDDEN', message: 'Denied' } }, continued: false })
  assert.deepEqual(await invoke([FAMILY_WRITE_PERMISSION]), { status: undefined, payload: undefined, continued: true })
  assert.deepEqual(await invoke([], ['Dirección general']), { status: undefined, payload: undefined, continued: true })
})

test('service also enforces minimum relations before accessing PostgreSQL', async () => {
  const input = validateIntegralFamilyInput(valid()).data
  for (const key of ['integrantes', 'programas']) {
    await assert.rejects(createIntegralFamily({ ...input, [key]: [] }, {}), (error) => error instanceof IntegralFamilyValidationError && error.details[0].field === key)
  }
})

test('family HTTP routes deny unauthenticated access independently of environment flags', async () => {
  const previous = { node: process.env.NODE_ENV, flag: process.env.ENABLE_FAMILY_INTEGRAL_API }
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`

  try {
    for (const [env, flag] of [[undefined, undefined], ['development', undefined], ['production', 'true'], ['test', 'true'], ['qa', 'false']]) {
      if (env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = env
      if (flag === undefined) delete process.env.ENABLE_FAMILY_INTEGRAL_API; else process.env.ENABLE_FAMILY_INTEGRAL_API = flag
      for (const [path, method] of [['registro-integral', 'POST'], ['opciones/programas', 'GET'], ['1/expediente', 'GET']]) {
        const response = await fetch(`${base}/api/v1/familias/${path}`, { method })
        assert.equal(response.status, 401)
        assert.equal((await response.json()).error.code, 'UNAUTHORIZED')
      }
    }
    process.env.NODE_ENV = 'qa'
    process.env.ENABLE_FAMILY_INTEGRAL_API = 'true'
    const invalid = await fetch(`${base}/api/v1/familias/registro-integral`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...valid(), integrantes: [] }) })
    assert.equal(invalid.status, 401)
    assert.equal((await fetch(`${base}/api/v1/familias/invalid/expediente`)).status, 401)
    assert.equal((await fetch(`${base}/api/v1/familias`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401)
    assert.equal((await fetch(`${base}/api/v1/familias`)).status, 401)
    assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { status: 'ok', service: 'viviendas-leon-api' })
  } finally {
    await new Promise((resolve) => server.close(resolve))
    if (previous.node === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous.node
    if (previous.flag === undefined) delete process.env.ENABLE_FAMILY_INTEGRAL_API; else process.env.ENABLE_FAMILY_INTEGRAL_API = previous.flag
  }
})
