import assert from 'node:assert/strict'
import { test } from 'node:test'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { execFileSync, spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import argon2 from 'argon2'

const inspect = (name) => JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8' }))[0]
const hash = (value) => createHash('sha256').update(value).digest('hex')
const normalHash = (container) => hash(JSON.stringify({ id: container.Id, config: container.Config, mounts: container.Mounts, ports: container.HostConfig.PortBindings }))
const environmentHash = () => { try { return hash(readFileSync(new URL('../.env', import.meta.url))) } catch (error) { if (error.code === 'ENOENT') return null; throw error } }

test('Brave integral record / real read-only family requests / isolated PostgreSQL QA', { skip: process.env.RUN_FAMILY_RECORD_REAL_QA !== 'true', timeout: 120000 }, async (t) => {
  const qa = inspect('viviendas-leon-qa-postgres')
  const normal = inspect('viviendas-leon-postgres')
  assert.equal(qa.State.Running, true)
  assert.equal(qa.Name, '/viviendas-leon-qa-postgres')
  assert.match(qa.Config.Image, /^postgres:17(?:$|-)/)
  assert.deepEqual(qa.NetworkSettings.Ports['5432/tcp'], [{ HostIp: '127.0.0.1', HostPort: '5433' }])
  const volume = qa.Mounts.find((mount) => mount.Destination === '/var/lib/postgresql/data')
  assert.equal(volume?.Name, 'viviendas-leon-qa-data')
  assert.notEqual(qa.Id, normal.Id)
  assert.ok(!normal.Mounts.some((mount) => mount.Source === volume.Source))
  const ids = execFileSync('docker', ['ps', '-aq'], { encoding: 'utf8' }).trim().split(/\s+/)
  const all = JSON.parse(execFileSync('docker', ['inspect', ...ids], { encoding: 'utf8' }))
  assert.deepEqual(all.filter((container) => container.Mounts.some((mount) => mount.Source === volume.Source)).map((container) => container.Id), [qa.Id])
  const originalNormalHash = normalHash(normal)
  const originalEnvironmentHash = environmentHash()
  assert.ok(process.env.QA_PASSWORD_FILE, 'Provide a private QA password file, not a habitual .env')
  const password = readFileSync(process.env.QA_PASSWORD_FILE, 'utf8').trim()
  assert.ok(password)
  const connectionString = `postgresql://viviendas_qa:${encodeURIComponent(password)}@127.0.0.1:5433/viviendas_leon_qa`
  const sql = new pg.Client({ connectionString, application_name: 'qa_family_record_read', options: '-c default_transaction_read_only=on' })
  await sql.connect().catch(() => { throw new Error('QA connection failed; credentials omitted') })
  const baseline = new Map()
  let api
  let vite
  let browser
  let socket
  let prisma
  let originalFindUnique
  let userId
  let nonReadFamilyRequests = 0
  let preserved = false
  const familyRequests = []
  let multiple
  let historical
  async function verifyPreservation() {
    for (const [table, expected] of baseline) {
      const frequencies = new Map()
      for (const row of (await sql.query(`SELECT md5(row_to_json(t)::text) AS fingerprint FROM public."${table}" t`)).rows) frequencies.set(row.fingerprint, (frequencies.get(row.fingerprint) ?? 0) + 1)
      for (const fingerprint of expected) {
        assert.ok(frequencies.get(fingerprint) > 0, `Preexisting row changed in ${table}; values omitted`)
        frequencies.set(fingerprint, frequencies.get(fingerprint) - 1)
      }
    }
    assert.equal(normalHash(inspect('viviendas-leon-postgres')), originalNormalHash)
    assert.equal(environmentHash(), originalEnvironmentHash)
    assert.equal(nonReadFamilyRequests, 0)
    preserved = true
  }
  try {
    const identity = (await sql.query("SELECT current_database() AS database,current_user AS username,inet_server_port() AS port,current_setting('transaction_read_only') AS read_only,version() AS version")).rows[0]
    assert.equal(identity.database, 'viviendas_leon_qa')
    assert.equal(identity.username, 'viviendas_qa')
    assert.equal(identity.port, 5432)
    assert.equal(identity.read_only, 'on')
    assert.match(identity.version, /^PostgreSQL 17\./)
    console.log('Record QA isolation:', JSON.stringify({ container: qa.Name, volume: volume.Name, host: '127.0.0.1', publishedPort: 5433, database: identity.database, username: identity.username, exclusiveVolume: true }))
    for (const { tablename } of (await sql.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows) {
      assert.match(tablename, /^[a-zA-Z_][a-zA-Z_0-9]*$/)
      baseline.set(tablename, (await sql.query(`SELECT md5(row_to_json(t)::text) AS fingerprint FROM public."${tablename}" t`)).rows.map((row) => row.fingerprint))
    }
    multiple = (await sql.query("SELECT f.id,f.nombre_referencia,(SELECT count(*)::int FROM integrante_familia i WHERE i.familia_id=f.id) AS members,(SELECT count(*)::int FROM familia_programa fp WHERE fp.familia_id=f.id) AS programs FROM familia f WHERE f.nombre_referencia LIKE 'QA_WIZARD_%' AND (SELECT count(*) FROM integrante_familia i WHERE i.familia_id=f.id)>=2 AND (SELECT count(*) FROM familia_programa fp WHERE fp.familia_id=f.id)>=2 ORDER BY f.id DESC LIMIT 1")).rows[0]
    historical = (await sql.query('SELECT f.id,f.nombre_referencia FROM familia f WHERE f.id=1 AND NOT EXISTS(SELECT 1 FROM integrante_familia i WHERE i.familia_id=f.id) AND NOT EXISTS(SELECT 1 FROM familia_programa fp WHERE fp.familia_id=f.id)')).rows[0]
    assert.ok(multiple && historical, 'Requires retained synthetic wizard and N01 historical fixtures; this runner never seeds families')
    process.env.DATABASE_URL = connectionString
    process.env.SESSION_SECRET = randomBytes(48).toString('hex')
    process.env.NODE_ENV = 'qa'
    process.env.ENABLE_FAMILY_INTEGRAL_API = 'true'
    process.env.ENABLE_OFFLINE_DEMO_SYNC = 'false'
    process.env.VITE_API_URL = '/api'
    const { app } = await import('../dist/app.js')
    const { getPrismaClient } = await import('../dist/config/prisma.js')
    prisma = getPrismaClient()
    const effective = await prisma.$queryRaw`SELECT current_database() AS database,current_user AS username,inet_server_port() AS port`
    assert.equal(effective[0].database, identity.database)
    assert.equal(effective[0].username, identity.username)
    assert.equal(effective[0].port, identity.port)
    // Only the authorized synthetic account/session are written. Every existing
    // family, member, association and catalog row is read-only in this runner.
    const email = `qa-record-${randomUUID()}@example.invalid`
    const accountPassword = randomBytes(32).toString('base64url')
    const passwordHash = await argon2.hash(accountPassword)
    await sql.query('SET default_transaction_read_only=off')
    userId = (await sql.query('INSERT INTO usuario(nombre,correo,password_hash,estado,fecha_creacion) VALUES($1,$2,$3,$4,now()) RETURNING id', ['QA RECORD READ USER', email, passwordHash, 'ACTIVO'])).rows[0].id
    await sql.query('SET default_transaction_read_only=on')
    api = createServer((req, res) => {
      if (req.url.startsWith('/api/v1/familias')) {
        familyRequests.push({ method: req.method, path: req.url })
        if (req.method !== 'GET') { nonReadFamilyRequests++; req.socket.destroy(); return }
      }
      app(req, res)
    })
    api.listen(0, '127.0.0.1')
    await once(api, 'listening')
    delete globalThis.__dirname // Generated Prisma global conflicts with ESM Vite plugins in a combined test process.
    const { createServer: createViteServer } = await import('vite')
    const root = fileURLToPath(new URL('../../web/', import.meta.url))
    vite = await createViteServer({ root, configFile: join(root, 'vite.config.ts'), mode: 'qa', server: { host: '127.0.0.1', port: 0, strictPort: true, proxy: { '/api': { target: `http://127.0.0.1:${api.address().port}`, changeOrigin: true } } } })
    await vite.listen()
    const base = `http://127.0.0.1:${vite.httpServer.address().port}`
    const profile = await mkdtemp(join(process.env.LOCALAPPDATA, 'Temp', 'opencode', 'family-record-real-'))
    browser = spawn(process.env.BRAVE_PATH || join(process.env.LOCALAPPDATA, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'), ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] })
    const endpoint = await new Promise((resolve, reject) => {
      let output = ''
      browser.stderr.on('data', (data) => { output += data; const match = /DevTools listening on (ws:\/\/[^\s]+)/.exec(output); if (match) resolve(match[1]) })
      browser.on('error', reject)
      browser.on('exit', () => reject(new Error('Brave exited before CDP')))
    })
    socket = new WebSocket(endpoint)
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
    let sequence = 0
    const pending = new Map()
    function send(method, params = {}, sessionId) {
      const id = ++sequence
      const result = new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
      socket.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }))
      return result
    }
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data)
      if (!message.id) return
      const request = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) request?.reject(new Error(message.error.message)); else request?.resolve(message.result)
    }
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    const command = (method, params = {}) => send(method, params, sessionId)
    const evaluate = async (expression) => {
      const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      if (result.exceptionDetails) throw new Error('Record browser evaluation failed; expression omitted to protect login credentials')
      return result.result.value
    }
    const wait = async (expression) => {
      for (let attempt = 0; attempt < 200; attempt++) {
        if (await evaluate(expression)) return
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      throw new Error('Record QA condition timed out; browser expression omitted')
    }
    const navigate = (path) => command('Page.navigate', { url: `${base}${path}` })
    const fill = (id, value) => evaluate(`(() => { const el=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`)
    const clickTab = async (index) => { await evaluate(`document.querySelectorAll('[role=tab]')[${index}].click()`); await wait(`document.querySelectorAll('[role=tab]')[${index}]?.getAttribute('aria-selected') === 'true'`) }
    const panelText = () => evaluate("document.querySelector('[role=tabpanel]:not([hidden])').innerText")
    const ready = () => wait("document.querySelector('[role=tablist]') !== null")
    await command('Page.enable')

    await t.test('real login and read multiple members/programs, counts matching independent SQL', async () => {
      await navigate('/login')
      await wait("document.getElementById('correo') !== null")
      await fill('correo', email)
      await fill('password', accountPassword)
      await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Iniciar sesión').click()")
      await wait("location.pathname==='/' && document.getElementById('main-content') !== null")
      await navigate(`/familias/${multiple.id}`)
      await ready()
      assert.equal(await evaluate("document.querySelector('[aria-label=\"Identificación del expediente\"]').innerText").then((text) => text.includes(multiple.nombre_referencia)), true)
      assert.equal(await evaluate("document.querySelector('[aria-label=\"Resumen de integrantes\"]').innerText").then((text) => text.includes(String(multiple.members))), true)
      assert.equal(await evaluate("document.querySelector('[aria-label=\"Resumen de programas\"]').innerText").then((text) => text.includes(String(multiple.programs))), true)
      await clickTab(1)
      assert.equal(await evaluate("document.querySelector('[role=tabpanel]:not([hidden]) tbody').rows.length"), multiple.members)
      await clickTab(2)
      const programs = (await sql.query('SELECT fp.id,fp.programa_id,p.nombre FROM familia_programa fp JOIN programa p ON p.id=fp.programa_id WHERE fp.familia_id=$1', [multiple.id])).rows
      const text = await panelText()
      for (const row of programs) { assert.ok(text.includes(row.nombre)); assert.ok(text.includes(`Programa #${row.programa_id}`)); assert.ok(text.includes(`Asociación #${row.id}`)) }
      await command('Page.reload')
      await wait("document.querySelector('[role=tab][aria-selected=true]')?.textContent === 'Información general'")
    })
    await t.test('retained historical family has real empty relationships and no invented values', async () => {
      await navigate(`/familias/${historical.id}`)
      await ready()
      await clickTab(1)
      assert.ok((await panelText()).includes('Sin integrantes registrados'))
      await clickTab(2)
      assert.ok((await panelText()).includes('Sin programas asociados'))
    })
    await t.test('real 400 and distinct missing/disabled 404 contracts', async () => {
      for (const [id, title] of [['invalid', 'Identificador no válido'], ['2147483647', 'Expediente inexistente']]) {
        await navigate(`/familias/${id}`)
        await wait(`document.body.innerText.includes(${JSON.stringify(title)})`)
      }
      process.env.ENABLE_FAMILY_INTEGRAL_API = 'false'
      try {
        await navigate(`/familias/${multiple.id}`)
        await wait("document.body.innerText.includes('Servicio integral deshabilitado')")
      } finally { process.env.ENABLE_FAMILY_INTEGRAL_API = 'true' }
    })
    await t.test('real induced 500 and real expired session before the integral GET', async () => {
      originalFindUnique = prisma.familia.findUnique
      const originalLog = console.error
      prisma.familia.findUnique = async () => { throw new Error('QA controlled read failure') }
      console.error = () => {}
      try {
        await navigate(`/familias/${multiple.id}`)
        await wait("document.body.innerText.includes('Error interno del servidor')")
      } finally { prisma.familia.findUnique = originalFindUnique; originalFindUnique = undefined; console.error = originalLog }
      assert.equal(await evaluate("(async()=> (await fetch('/api/v1/auth/logout',{method:'POST',credentials:'same-origin'})).status)()"), 200)
      const before = familyRequests.length
      await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Reintentar').click()")
      await wait("document.body.innerText.includes('Sesión expirada o no válida')")
      assert.equal(familyRequests.length, before, 'Expired session must prevent integral GET')
      assert.equal((await sql.query("SELECT count(*)::int AS count FROM session WHERE (sess->>'userId')::int=$1", [userId])).rows[0].count, 0)
    })
    await t.test('read-only requests and all retained rows/configurations preserved', verifyPreservation)
    console.log('Real record evidence:', JSON.stringify({ userId, multipleFamilyId: multiple.id, historicalFamilyId: historical.id, memberCount: multiple.members, programCount: multiple.programs, integralGetRequests: familyRequests.filter((request) => request.path.endsWith('/expediente')).length, nonReadFamilyRequests, preexistingRowsPreserved: preserved }))
  } finally {
    if (originalFindUnique && prisma) prisma.familia.findUnique = originalFindUnique
    process.env.ENABLE_FAMILY_INTEGRAL_API = 'true'
    try { if (baseline.size) await verifyPreservation() } finally {
      console.log('Retained own record QA account:', JSON.stringify({ userId, preexistingRowsPreserved: preserved, normalEnvironmentUnchanged: normalHash(inspect('viviendas-leon-postgres')) === originalNormalHash }))
      socket?.close()
      browser?.kill()
      if (vite) await vite.close()
      if (api) { api.closeAllConnections(); await new Promise((resolve) => api.close(resolve)) }
      if (prisma) await prisma.$disconnect()
      await sql.end()
    }
  }
})
