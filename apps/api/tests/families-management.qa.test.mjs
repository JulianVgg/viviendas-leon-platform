import assert from 'node:assert/strict'
import { test } from 'node:test'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import pg from 'pg'

const digest = (value) => createHash('sha256').update(value).digest('hex')
const inspect = (name) => JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8' }))[0]
const containerFingerprint = (container) => digest(JSON.stringify({ id: container.Id, mounts: container.Mounts, ports: container.HostConfig.PortBindings }))

test('FAM-03/FAM-05 persistence, concurrency, history and audit in isolated PostgreSQL QA', {
  skip: process.env.RUN_FAMILY_MANAGEMENT_QA !== 'true',
  timeout: 120000,
}, async () => {
  const qa = inspect('viviendas-leon-qa-postgres')
  const normal = inspect('viviendas-leon-postgres')
  assert.equal(qa.State.Running, true)
  assert.match(qa.Config.Image, /^postgres:17(?:$|-)/)
  assert.deepEqual(qa.NetworkSettings.Ports['5432/tcp'], [{ HostIp: '127.0.0.1', HostPort: '5433' }])
  assert.notEqual(qa.Id, normal.Id)
  const normalBefore = containerFingerprint(normal)
  assert.ok(process.env.QA_PASSWORD_FILE, 'Provide QA_PASSWORD_FILE; the habitual .env is never used')
  const password = readFileSync(process.env.QA_PASSWORD_FILE, 'utf8').trim()
  const connectionString = `postgresql://viviendas_qa:${encodeURIComponent(password)}@127.0.0.1:5433/viviendas_leon_qa`
  const sql = new pg.Client({ connectionString, application_name: 'qa_family_management', options: '-c default_transaction_read_only=on' })
  await sql.connect()
  const prefix = `QA_MANAGEMENT_${randomUUID()}`
  const retained = {}
  let prisma
  try {
    const identity = (await sql.query("SELECT current_database() AS database,current_user AS username,inet_server_port() AS port,current_setting('transaction_read_only') AS read_only,version() AS version")).rows[0]
    assert.deepEqual({ database: identity.database, username: identity.username, port: identity.port, readOnly: identity.read_only }, { database: 'viviendas_leon_qa', username: 'viviendas_qa', port: 5432, readOnly: 'on' })
    assert.match(identity.version, /^PostgreSQL 17\./)
    await sql.query('SET default_transaction_read_only=off')
    const user = (await sql.query('INSERT INTO usuario(nombre,correo,password_hash,estado,fecha_creacion) VALUES($1,$2,$3,$4,now()) RETURNING id', [`${prefix} USER`, `${prefix.toLowerCase()}@example.invalid`, 'synthetic-not-for-login', 'ACTIVO'])).rows[0]
    const municipality = (await sql.query('INSERT INTO municipio(nombre,activo) VALUES($1,true) RETURNING id', [`${prefix} MUNICIPALITY`])).rows[0]
    const community = (await sql.query('INSERT INTO comunidad(municipio_id,nombre,activo) VALUES($1,$2,true) RETURNING id', [municipality.id, `${prefix} COMMUNITY`])).rows[0]
    const family = (await sql.query("INSERT INTO familia(comunidad_id,nombre_referencia,fecha_ingreso,estado,observaciones) VALUES($1,$2,$3,'ACTIVA',$4) RETURNING id", [community.id, `${prefix} FAMILY`, '2026-10-01', 'Synthetic family notes'])).rows[0]
    const otherFamily = (await sql.query("INSERT INTO familia(comunidad_id,nombre_referencia,estado) VALUES($1,$2,'ACTIVA') RETURNING id", [community.id, `${prefix} OTHER FAMILY`])).rows[0]
    const members = []
    for (const index of [1, 2]) members.push((await sql.query("INSERT INTO integrante_familia(familia_id,nombre_completo,fecha_nacimiento,sexo,parentesco,telefono,observaciones,activo) VALUES($1,$2,$3,$4,$5,$6,$7,true) RETURNING id", [family.id, `${prefix} PERSON ${index}`, `200${index}-01-01`, index === 1 ? 'Femenino' : 'Masculino', index === 1 ? 'Madre' : 'Hijo', `555000${index}`, 'Synthetic member notes'])).rows[0])
    const foreignMember = (await sql.query("INSERT INTO integrante_familia(familia_id,nombre_completo,activo) VALUES($1,$2,true) RETURNING id", [otherFamily.id, `${prefix} FOREIGN PERSON`])).rows[0]
    const program = (await sql.query("INSERT INTO programa(nombre,estado) VALUES($1,'ACTIVO') RETURNING id", [`${prefix} PROGRAM`])).rows[0]
    const association = (await sql.query("INSERT INTO familia_programa(familia_id,programa_id,estado) VALUES($1,$2,'ACTIVO') RETURNING id", [family.id, program.id])).rows[0]
    const training = (await sql.query("INSERT INTO capacitacion(comunidad_id,tema,fecha,estado) VALUES($1,$2,$3,'REALIZADA') RETURNING id", [community.id, `${prefix} TRAINING`, '2026-10-02'])).rows[0]
    const participation = (await sql.query('INSERT INTO participacion_capacitacion(capacitacion_id,integrante_familia_id,asistio) VALUES($1,$2,true) RETURNING id', [training.id, members[0].id])).rows[0]
    Object.assign(retained, { userId: user.id, familyId: family.id, otherFamilyId: otherFamily.id, memberIds: members.map(({ id }) => id), foreignMemberId: foreignMember.id, associationId: association.id, participationId: participation.id })

    process.env.DATABASE_URL = connectionString
    const management = await import('../dist/modules/families/families-management.service.js')
    const integral = await import('../dist/modules/families/families-integral.service.js')
    const { getPrismaClient } = await import('../dist/config/prisma.js')
    prisma = getPrismaClient()

    const initial = await integral.findIntegralFamily(family.id)
    assert.equal(initial.integrantes.length, 2)
    assert.equal(initial.programas.length, 1)
    const updated = await management.updateFamily(family.id, { version: initial.version, nombreReferencia: `${prefix} FAMILY UPDATED`, observaciones: null }, user.id)
    assert.equal(updated.nombreReferencia, `${prefix} FAMILY UPDATED`)
    assert.equal(updated.observaciones, null)
    assert.equal(updated.integrantes.length, 2)
    assert.equal(updated.programas[0].id, association.id)
    await assert.rejects(management.updateFamily(family.id, { version: initial.version, nombreReferencia: 'STALE WRITE' }, user.id), (error) => error.status === 409 && error.code === 'CONCURRENT_MODIFICATION')

    const createInput = { nombreCompleto: `${prefix} NEW PERSON`, fechaNacimiento: new Date('2003-03-03T00:00:00.000Z'), sexo: 'Femenino', parentesco: 'Hija', telefono: null, observaciones: null }
    const key = randomUUID()
    const created = await management.createFamilyMember(family.id, createInput, user.id, key)
    const replay = await management.createFamilyMember(family.id, createInput, user.id, key)
    assert.equal(created.replayed, false)
    assert.equal(replay.replayed, true)
    assert.equal(replay.member.id, created.member.id)
    retained.memberIds.push(created.member.id)
    await assert.rejects(management.createFamilyMember(family.id, { ...createInput, nombreCompleto: `${prefix} DIFFERENT` }, user.id, key), (error) => error.status === 409 && error.code === 'IDEMPOTENCY_CONFLICT')

    const edited = await management.updateFamilyMember(family.id, created.member.id, { version: created.member.version, telefono: '5559999', observaciones: null }, user.id)
    assert.equal(edited.telefono, '5559999')
    await assert.rejects(management.updateFamilyMember(family.id, foreignMember.id, { version: edited.version, telefono: null }, user.id), (error) => error.status === 404)
    const deactivated = await management.updateFamilyMemberState(family.id, members[0].id, { activo: false, version: initial.integrantes[0].version }, user.id)
    assert.equal(deactivated.activo, false)
    assert.equal((await sql.query('SELECT count(*)::int AS count FROM participacion_capacitacion WHERE id=$1 AND integrante_familia_id=$2', [participation.id, members[0].id])).rows[0].count, 1)
    const reactivated = await management.updateFamilyMemberState(family.id, members[0].id, { activo: true, version: deactivated.version }, user.id)
    assert.equal(reactivated.activo, true)

    let current = await integral.findIntegralFamily(family.id)
    for (const member of current.integrantes.slice(0, -1)) await management.updateFamilyMemberState(family.id, member.id, { activo: false, version: member.version }, user.id)
    current = await integral.findIntegralFamily(family.id)
    const lastActive = current.integrantes.find(({ activo }) => activo)
    await assert.rejects(management.updateFamilyMemberState(family.id, lastActive.id, { activo: false, version: lastActive.version }, user.id), (error) => error.status === 409 && error.code === 'LAST_ACTIVE_MEMBER')

    const persisted = await integral.findIntegralFamily(family.id)
    assert.equal(persisted.integrantes.length, 3)
    assert.equal(persisted.programas.length, 1)
    const audits = (await sql.query('SELECT usuario_id,entidad,registro_id,accion,datos_anteriores,datos_nuevos FROM bitacora WHERE usuario_id=$1 AND registro_id=ANY($2::text[]) ORDER BY id', [user.id, [String(family.id), ...retained.memberIds.map(String)]])).rows
    assert.ok(audits.length >= 6)
    assert.ok(audits.every((row) => row.datos_anteriores === null || !row.datos_anteriores.includes(prefix)))
    assert.ok(audits.every((row) => row.datos_nuevos === null || (!row.datos_nuevos.includes(`${prefix} PERSON`) && !row.datos_nuevos.includes('5559999'))))
    assert.ok(audits.some((row) => row.entidad === 'familia' && row.accion === 'UPDATE' && row.datos_nuevos.includes('nombreReferencia')))
  } finally {
    assert.equal(containerFingerprint(inspect('viviendas-leon-postgres')), normalBefore)
    console.log('Retained isolated QA fixtures:', JSON.stringify(retained))
    if (prisma) await prisma.$disconnect()
    await sql.end()
  }
})
