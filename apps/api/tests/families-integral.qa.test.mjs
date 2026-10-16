import assert from 'node:assert/strict'
import { test } from 'node:test'
import { once } from 'node:events'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import pg from 'pg'

pg.types.setTypeParser(1082, (value) => new Date(`${value}T00:00:00.000Z`))

const hash = (value) => createHash('sha256').update(value).digest('hex')
const inspect = (name) => JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8' }))[0]
const environmentHash = () => {
  try { return hash(readFileSync(new URL('../.env', import.meta.url))) } catch (error) { if (error.code === 'ENOENT') return null; throw error }
}

test('isolated PostgreSQL QA integration', { skip: process.env.RUN_FAMILY_INTEGRAL_QA !== 'true' }, async (t) => {
  // Never load apps/api/.env. Only accept a separately supplied, validated QA URL.
  const qa = inspect('viviendas-leon-qa-postgres')
  const normal = inspect('viviendas-leon-postgres')
  assert.equal(qa.Name, '/viviendas-leon-qa-postgres')
  assert.match(qa.Config.Image, /^postgres:17(?:$|-)/)
  assert.equal(qa.State.Running, true, 'QA must already be running; this test does not start containers')
  assert.notEqual(qa.Id, normal.Id)
  assert.deepEqual(qa.NetworkSettings.Ports['5432/tcp'], [{ HostIp: '127.0.0.1', HostPort: '5433' }])
  const volume = qa.Mounts.find((mount) => mount.Destination === '/var/lib/postgresql/data')
  assert.equal(volume?.Name, 'viviendas-leon-qa-data')
  assert.ok(!normal.Mounts.some((mount) => mount.Source === volume.Source))
  const containerIds = execFileSync('docker', ['ps', '-aq'], { encoding: 'utf8' }).trim().split(/\s+/).filter(Boolean)
  const containers = JSON.parse(execFileSync('docker', ['inspect', ...containerIds], { encoding: 'utf8' }))
  assert.deepEqual(containers.filter((container) => container.Mounts.some((mount) => mount.Source === volume.Source)).map((container) => container.Id), [qa.Id])
  const normalHash = hash(JSON.stringify({ id: normal.Id, config: normal.Config, mounts: normal.Mounts, ports: normal.HostConfig.PortBindings }))
  const originalEnvironmentHash = environmentHash()

  let connectionString = process.env.TEST_DATABASE_URL
  if (!connectionString) {
    assert.ok(process.env.QA_PASSWORD_FILE, 'Provide TEST_DATABASE_URL or QA_PASSWORD_FILE without printing credentials')
    const password = readFileSync(process.env.QA_PASSWORD_FILE, 'utf8').trim()
    assert.ok(password.length > 0)
    connectionString = `postgresql://viviendas_qa:${encodeURIComponent(password)}@127.0.0.1:5433/viviendas_leon_qa`
  }
  const url = new URL(connectionString)
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol))
  assert.equal(url.hostname, '127.0.0.1')
  assert.equal(url.port, '5433')
  assert.equal(url.pathname, '/viviendas_leon_qa')
  assert.equal(decodeURIComponent(url.username), 'viviendas_qa')
  assert.equal(url.search, '', 'Connection overrides/options are not accepted by the QA runner')
  const sql = new pg.Client({ connectionString, application_name: 'qa_families_integral_verify', options: '-c default_transaction_read_only=on' })
  await sql.connect()
  let server
  let prisma
  const prefix = `QA_INTEGRAL_${new Date().toISOString().slice(0, 10).replaceAll('-', '')}_${randomUUID()}`
  const manifest = { prefix, municipios: [], comunidades: [], programas: [], familias: [] }
  try {
    const identity = (await sql.query('SELECT current_database() AS database, current_user AS username, inet_server_port() AS port, version() AS version')).rows[0]
    assert.equal(identity.database, 'viviendas_leon_qa')
    assert.equal(identity.username, 'viviendas_qa')
    assert.equal(identity.port, 5432) // Internal PostgreSQL port, not the published host port.
    assert.match(identity.version, /^PostgreSQL 17\./)
    console.log('QA isolation confirmed:', JSON.stringify({ containerId: qa.Id, volume: volume.Name, host: url.hostname, publishedPort: url.port, ...identity }))
    // Snapshot every preexisting row in the six affected tables, including retained N01 data.
    const tables = ['municipio', 'comunidad', 'programa', 'familia', 'integrante_familia', 'familia_programa']
    const baseline = new Map()
    for (const table of tables) baseline.set(table, (await sql.query(`SELECT * FROM ${table} ORDER BY id`)).rows)
    // Table names above are static source constants, not request/user input.
    await sql.query('SET default_transaction_read_only = off')
    process.env.DATABASE_URL = connectionString
    process.env.NODE_ENV = 'qa'
    process.env.ENABLE_FAMILY_INTEGRAL_API = 'true'
    process.env.SESSION_SECRET = randomBytes(48).toString('hex')
    const { app } = await import('../dist/app.js')
    const { getPrismaClient } = await import('../dist/config/prisma.js')
    const { createIntegralFamily, IntegralFamilyValidationError } = await import('../dist/modules/families/families-integral.service.js')
    const { validateIntegralFamilyInput } = await import('../dist/modules/families/families-integral.validation.js')
    prisma = getPrismaClient()
    const prismaIdentity = await prisma.$queryRaw`SELECT current_database() AS database, current_user AS username, inet_server_port() AS port`
    assert.equal(prismaIdentity[0].database, identity.database)
    assert.equal(prismaIdentity[0].username, identity.username)
    assert.equal(prismaIdentity[0].port, identity.port)
    server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const base = `http://127.0.0.1:${server.address().port}/api`
    async function request(path, body) {
      const response = await fetch(`${base}${path}`, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      return { status: response.status, location: response.headers.get('location'), body: await response.json() }
    }
    const activeCommunities = (await request('/v1/comunidades')).body.data
    assert.ok(activeCommunities.length, 'N01 active catalog required; do not recreate its fixtures')
    const communityId = activeCommunities[0].id
    let programOptions = (await request('/v1/familias/opciones/programas')).body.data
    if (programOptions.length < 2) {
      // Only the number of synthetic programs needed for the multi-program case.
      for (let index = programOptions.length; index < 2; index++) {
        const created = (await sql.query('INSERT INTO programa (nombre, descripcion, estado) VALUES ($1, $2, $3) RETURNING id', [`${prefix} PROGRAM ${index}`, 'Synthetic integral API fixture', 'ACTIVO'])).rows[0]
        manifest.programas.push(created.id)
      }
      programOptions = (await request('/v1/familias/opciones/programas')).body.data
    }
    const programIds = programOptions.slice(0, 2).map((program) => program.id)
    for (const active of [true, false]) {
      const municipality = (await sql.query('INSERT INTO municipio (nombre, activo) VALUES ($1, $2) RETURNING id', [`${prefix} MUNICIPALITY ${active}`, active])).rows[0]
      manifest.municipios.push(municipality.id)
    }
    for (const [municipalityId, active, label] of [[manifest.municipios[0], true, 'ACTIVE'], [manifest.municipios[0], false, 'INACTIVE'], [manifest.municipios[1], true, 'INACTIVE MUNICIPALITY']]) {
      const community = (await sql.query('INSERT INTO comunidad (municipio_id, nombre, activo) VALUES ($1, $2, $3) RETURNING id', [municipalityId, `${prefix} COMMUNITY ${label}`, active])).rows[0]
      manifest.comunidades.push(community.id)
    }
    const valid = (suffix = 'FAMILY') => ({ nombreReferencia: `${prefix} ${suffix}`, comunidadId: communityId, fechaIngreso: '2026-10-13', observaciones: 'Synthetic QA data', integrantes: [{ nombreCompleto: `${prefix} PERSON ONE`, fechaNacimiento: '2000-01-15', sexo: 'F', parentesco: 'Representante' }], programas: [{ programaId: programIds[0], fechaIngreso: '2026-10-13', estado: 'ACTIVO' }] })
    let single
    let multiple
    await t.test('real program catalog matches SQL and only offers ACTIVO', async () => {
      const expected = (await sql.query("SELECT id, nombre, descripcion, estado FROM programa WHERE estado = 'ACTIVO' ORDER BY nombre, id")).rows
      assert.deepEqual((await request('/v1/familias/opciones/programas')).body.data, expected)
    })
    await t.test('registers one member and one program with generated identity', async () => {
      const result = await request('/v1/familias/registro-integral', valid('SINGLE'))
      assert.equal(result.status, 201)
      single = result.body.data
      manifest.familias.push(single.id)
      assert.equal(single.estado, 'ACTIVA')
      assert.equal(single.integrantes.length, 1)
      assert.equal(single.integrantes[0].activo, true)
      assert.equal(single.programas.length, 1)
      assert.equal(single.programas[0].programaId, programIds[0])
      assert.equal(single.fechaIngreso, '2026-10-13T00:00:00.000Z')
      assert.equal(result.location, `/api/v1/familias/${single.id}/expediente`)
    })
    await t.test('registers several members and programs atomically', async () => {
      const body = valid('MULTIPLE')
      body.integrantes.push({ nombreCompleto: `${prefix} PERSON TWO` })
      body.programas.push({ programaId: programIds[1] })
      const result = await request('/v1/familias/registro-integral', body)
      assert.equal(result.status, 201)
      multiple = result.body.data
      manifest.familias.push(multiple.id)
      assert.equal(multiple.integrantes.length, 2)
      assert.equal(multiple.programas.length, 2)
      assert.ok(multiple.integrantes.every((member) => member.activo))
    })
    const invalidCases = [
      ['empty members', (b) => { b.integrantes = [] }, 'integrantes'],
      ['empty programs', (b) => { b.programas = [] }, 'programas'],
      ['blank member', (b) => { b.integrantes[0].nombreCompleto = ' ' }, 'integrantes[0].nombreCompleto'],
      ['nonexistent program', (b) => { b.programas[0].programaId = 2147483647 }, 'programas[0].programaId'],
      ['nonexistent community', (b) => { b.comunidadId = 2147483647 }, 'comunidadId'],
      ['inactive community', (b) => { b.comunidadId = manifest.comunidades[1] }, 'comunidadId'],
      ['inactive municipality', (b) => { b.comunidadId = manifest.comunidades[2] }, 'comunidadId'],
      ['duplicate program', (b) => { b.programas.push({ programaId: programIds[0] }) }, 'programas[1].programaId'],
      ['impossible date', (b) => { b.integrantes[0].fechaNacimiento = '2000-02-30' }, 'integrantes[0].fechaNacimiento'],
      ['unknown nested field', (b) => { b.programas[0].familiaId = 1 }, 'programas[0].familiaId'],
    ]
    for (const [name, change, field] of invalidCases) await t.test(`rejects ${name} with field errors and no writes`, async () => {
      const before = await prisma.familia.count()
      const body = valid(`INVALID ${name}`)
      change(body)
      const result = await request('/v1/familias/registro-integral', body)
      assert.equal(result.status, 400)
      assert.equal(result.body.error.code, 'VALIDATION_ERROR')
      assert.ok(result.body.error.details.some((detail) => detail.field === field))
      assert.equal(await prisma.familia.count(), before)
    })
    await t.test('relational integrity and record content match independent SQL', async () => {
      for (const record of [single, multiple]) {
        const response = await request(`/v1/familias/${record.id}/expediente`)
        assert.equal(response.status, 200)
        assert.deepEqual(response.body.data, record)
        const family = (await sql.query('SELECT * FROM familia WHERE id = $1', [record.id])).rows[0]
        assert.equal(family.nombre_referencia, record.nombreReferencia)
        assert.equal(family.comunidad_id, record.comunidad.id)
        assert.equal(family.estado, record.estado)
        assert.equal(family.observaciones, record.observaciones)
        const members = (await sql.query('SELECT * FROM integrante_familia WHERE familia_id = $1 ORDER BY id', [record.id])).rows
        assert.deepEqual(members.map((member) => member.id), record.integrantes.map((member) => member.id))
        for (const member of members) {
          const dto = record.integrantes.find((item) => item.id === member.id)
          assert.equal(member.nombre_completo, dto.nombreCompleto)
          assert.equal(member.activo, dto.activo)
          assert.equal(member.fecha_nacimiento?.toISOString() ?? null, dto.fechaNacimiento)
          for (const key of ['sexo', 'parentesco', 'telefono', 'observaciones']) assert.equal(member[key], dto[key])
        }
        const associations = (await sql.query('SELECT fp.*, p.nombre FROM familia_programa fp JOIN programa p ON p.id = fp.programa_id WHERE fp.familia_id = $1 ORDER BY fp.id', [record.id])).rows
        assert.equal(associations.length, record.programas.length)
        for (const association of associations) {
          const dto = record.programas.find((item) => item.id === association.id)
          assert.equal(dto.programaId, association.programa_id)
          assert.equal(dto.programa.nombre, association.nombre)
          assert.equal(dto.fechaIngreso, association.fecha_ingreso?.toISOString() ?? null)
          assert.equal(dto.fechaSalida, association.fecha_salida?.toISOString() ?? null)
          assert.equal(dto.estado, association.estado)
          assert.equal(dto.observaciones, association.observaciones)
        }
      }
      assert.equal((await sql.query('SELECT count(*)::int AS count FROM integrante_familia i LEFT JOIN familia f ON f.id=i.familia_id WHERE f.id IS NULL')).rows[0].count, 0)
      assert.equal((await sql.query('SELECT count(*)::int AS count FROM familia_programa fp LEFT JOIN familia f ON f.id=fp.familia_id LEFT JOIN programa p ON p.id=fp.programa_id WHERE f.id IS NULL OR p.id IS NULL')).rows[0].count, 0)
    })
    await t.test('complete PostgreSQL rollback after family, members and partial association writes', async () => {
      const input = validateIntegralFamilyInput(valid('ROLLBACK')).data
      input.programas.push({ ...input.programas[0], programaId: programIds[1] })
      const counts = async () => Promise.all([prisma.familia.count(), prisma.integranteFamilia.count(), prisma.familiaPrograma.count()])
      const before = await counts()
      // Test-only dependency injection, not an API flag or production failure hook.
      const failingClient = new Proxy(prisma, { get(target, key) {
        if (key !== '$transaction') return Reflect.get(target, key)
        return (callback) => target.$transaction((transaction) => callback(new Proxy(transaction, { get(tx, property) {
          if (property !== 'familiaPrograma') return Reflect.get(tx, property)
          return { createMany: async ({ data }) => {
            await tx.familiaPrograma.createMany({ data: [data[0]] })
            throw new Error('QA deliberate transaction failure')
          } }
        } })))
      } })
      await assert.rejects(createIntegralFamily(input, failingClient), /QA deliberate transaction failure/)
      assert.deepEqual(await counts(), before)
      assert.equal(await prisma.familia.count({ where: { nombreReferencia: input.nombreReferencia } }), 0)
    })
    await t.test('rechecks active community inside transaction after a preflight race', async () => {
      const body = valid('REFERENCE RACE')
      body.comunidadId = manifest.comunidades[0]
      const input = validateIntegralFamilyInput(body).data
      const racingClient = new Proxy(prisma, { get(target, key) {
        if (key !== '$transaction') return Reflect.get(target, key)
        return async (callback) => {
          await sql.query('UPDATE comunidad SET activo = false WHERE id = $1', [body.comunidadId])
          return target.$transaction(callback)
        }
      } })
      try {
        await assert.rejects(createIntegralFamily(input, racingClient), (error) => error instanceof IntegralFamilyValidationError && error.details[0].field === 'comunidadId')
        assert.equal(await prisma.familia.count({ where: { nombreReferencia: input.nombreReferencia } }), 0)
      } finally { await sql.query('UPDATE comunidad SET activo = true WHERE id = $1', [body.comunidadId]) }
    })
    await t.test('FOR SHARE protects community, municipality and program from concurrent updates', async () => {
      const locker = new pg.Client({ connectionString, application_name: 'qa_families_integral_lock_probe' })
      await locker.connect()
      const input = validateIntegralFamilyInput(valid('LOCK PROBE')).data
      input.comunidadId = manifest.comunidades[0]
      const lockProbe = new Proxy(prisma, { get(target, key) {
        if (key !== '$transaction') return Reflect.get(target, key)
        return (callback) => target.$transaction((tx) => callback(new Proxy(tx, { get(transaction, property) {
          if (property !== 'familia') return Reflect.get(transaction, property)
          return { create: async () => {
            // All probes roll back even if a regression unexpectedly permits an update.
            for (const [table, id] of [['comunidad', input.comunidadId], ['municipio', manifest.municipios[0]], ['programa', programIds[0]]]) {
              await locker.query('BEGIN')
              try {
                await locker.query("SET LOCAL lock_timeout = '150ms'")
                await assert.rejects(locker.query(`UPDATE ${table} SET id = id WHERE id = $1`, [id]), (error) => error.code === '55P03')
              } finally { await locker.query('ROLLBACK') }
            }
            throw new Error('QA lock probe complete')
          } }
        } })))
      } })
      try { await assert.rejects(createIntegralFamily(input, lockProbe), /QA lock probe complete/) }
      finally { await locker.end() }
    })
    await t.test('rechecks selectable program state inside the transaction', async () => {
      const input = validateIntegralFamilyInput(valid('PROGRAM RACE')).data
      const changingClient = new Proxy(prisma, { get(target, key) {
        if (key !== '$transaction') return Reflect.get(target, key)
        return (callback) => target.$transaction((tx) => callback(new Proxy(tx, { get(transaction, property) {
          if (property !== '$queryRaw') return Reflect.get(transaction, property)
          return async (...args) => {
            // Only the program query is a Prisma.sql object; community uses a tagged template.
            if (!Array.isArray(args[0])) await tx.programa.update({ where: { id: programIds[0] }, data: { estado: 'INACTIVO' } })
            return transaction.$queryRaw(...args)
          }
        } })))
      } })
      await assert.rejects(createIntegralFamily(input, changingClient), (error) => error instanceof IntegralFamilyValidationError && error.details.some((detail) => detail.field === 'programas[0].programaId'))
      assert.equal(await prisma.familia.count({ where: { nombreReferencia: input.nombreReferencia } }), 0)
      // The status change was inside the rejected transaction and must also roll back.
      assert.equal((await prisma.programa.findUnique({ where: { id: programIds[0] } })).estado, 'ACTIVO')
    })
    await t.test('failure reading the new record rolls back all writes and HTTP hides internals', async () => {
      const input = valid('READ ROLLBACK')
      const originalTransaction = prisma.$transaction
      const originalLog = console.error
      const counts = async () => [await prisma.familia.count(), await prisma.integranteFamilia.count(), await prisma.familiaPrograma.count()]
      const before = await counts()
      prisma.$transaction = (callback) => originalTransaction.call(prisma, (tx) => callback(new Proxy(tx, { get(transaction, property) {
        if (property !== 'familia') return Reflect.get(transaction, property)
        return new Proxy(transaction.familia, { get(delegate, operation) {
          if (operation === 'findUniqueOrThrow') return async () => { throw new Error('QA PRIVATE PRISMA READ DETAIL') }
          return Reflect.get(delegate, operation)
        } })
      } })))
      console.error = () => {}
      try {
        const response = await request('/v1/familias/registro-integral', input)
        assert.equal(response.status, 500)
        assert.equal(response.body.error.code, 'FAMILY_INTEGRAL_CREATE_ERROR')
        assert.ok(!JSON.stringify(response.body).includes('PRIVATE'))
        assert.deepEqual(await counts(), before)
      } finally { prisma.$transaction = originalTransaction; console.error = originalLog }
    })
    await t.test('valid but absent record returns 404 and invalid ids return 400', async () => {
      assert.equal((await request('/v1/familias/2147483647/expediente')).status, 404)
      for (const id of ['0', '-1', 'abc', '1.5', '2147483648']) assert.equal((await request(`/v1/familias/${id}/expediente`)).status, 400)
    })
    await t.test('unexpected errors return generic 500 without internal details', async () => {
      const original = prisma.familia.findUnique
      const originalLog = console.error
      prisma.familia.findUnique = async () => { throw new Error('QA PRIVATE SQL DETAIL') }
      console.error = () => {}
      try {
        const result = await request(`/v1/familias/${single.id}/expediente`)
        assert.equal(result.status, 500)
        assert.equal(result.body.error.code, 'FAMILY_INTEGRAL_DETAIL_ERROR')
        assert.ok(!JSON.stringify(result.body).includes('PRIVATE'))
      } finally { prisma.familia.findUnique = original; console.error = originalLog }
    })
    await t.test('basic POST remains compatible and permits homonymous families without members/programs', async () => {
      const body = { nombreReferencia: `${prefix} BASIC`, comunidadId: communityId }
      const first = await request('/v1/familias', body)
      const second = await request('/v1/familias', body)
      assert.equal(first.status, 201)
      assert.equal(second.status, 201)
      assert.notEqual(first.body.data.id, second.body.data.id)
      manifest.familias.push(first.body.data.id, second.body.data.id)
      assert.deepEqual(Object.keys(first.body.data).sort(), ['id', 'nombreReferencia', 'fechaIngreso', 'estado', 'observaciones', 'comunidad'].sort())
      assert.deepEqual((await request(`/v1/familias/${first.body.data.id}`)).body, first.body)
      assert.equal(await prisma.integranteFamilia.count({ where: { familiaId: first.body.data.id } }), 0)
      assert.equal(await prisma.familiaPrograma.count({ where: { familiaId: first.body.data.id } }), 0)
    })
    await t.test('basic list, detail, communities and health preserve contracts', async () => {
      const list = await request(`/v1/familias?search=${encodeURIComponent(prefix)}&page=1&limit=2`)
      assert.equal(list.status, 200)
      assert.deepEqual(Object.keys(list.body).sort(), ['data', 'pagination'])
      assert.deepEqual(list.body.pagination, { page: 1, limit: 2, total: 4, totalPages: 2 })
      assert.deepEqual(Object.keys(list.body.data[0]).sort(), ['id', 'nombreReferencia', 'fechaIngreso', 'estado', 'comunidad', 'programas', 'integrantes'].sort())
      const detail = await request(`/v1/familias/${single.id}`)
      assert.ok(!('integrantes' in detail.body.data))
      assert.ok(!('programas' in detail.body.data))
      assert.deepEqual((await request('/v1/comunidades')).body.data, await prisma.comunidad.findMany({ where: { activo: true, municipio: { activo: true } }, orderBy: [{ municipio: { nombre: 'asc' } }, { nombre: 'asc' }, { id: 'asc' }], select: { id: true, nombre: true, municipio: { select: { id: true, nombre: true } } } }))
      assert.deepEqual((await request('/health')).body, { status: 'ok', service: 'viviendas-leon-api' })
    })
    await t.test('production cannot enable integral endpoints even with flag true', async () => {
      process.env.NODE_ENV = 'production'
      try {
        assert.equal((await request('/v1/familias/registro-integral', valid('PRODUCTION DENIED'))).status, 404)
        assert.equal((await request('/v1/familias/opciones/programas')).status, 404)
        assert.equal((await request(`/v1/familias/${single.id}/expediente`)).status, 404)
        assert.equal((await request(`/v1/familias/${single.id}`)).status, 200)
      } finally { process.env.NODE_ENV = 'qa' }
    })
    await t.test('all preexisting N01 rows and normal environment are unchanged', async () => {
      for (const [table, rows] of baseline) {
        if (!rows.length) continue
        const actual = (await sql.query(`SELECT * FROM ${table} WHERE id = ANY($1::int[]) ORDER BY id`, [rows.map((row) => row.id)])).rows
        assert.deepEqual(actual, rows)
      }
      const currentNormal = inspect('viviendas-leon-postgres')
      assert.equal(hash(JSON.stringify({ id: currentNormal.Id, config: currentNormal.Config, mounts: currentNormal.Mounts, ports: currentNormal.HostConfig.PortBindings })), normalHash)
      assert.equal(environmentHash(), originalEnvironmentHash)
    })
  } finally {
    console.log('Retained synthetic QA fixture IDs (no preexisting rows deleted):', JSON.stringify(manifest))
    if (server) await new Promise((resolve) => server.close(resolve))
    if (prisma) await prisma.$disconnect()
    await sql.end()
  }
})
