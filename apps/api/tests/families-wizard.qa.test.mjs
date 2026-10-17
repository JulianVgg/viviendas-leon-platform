import assert from 'node:assert/strict'
import { test } from 'node:test'
import { once } from 'node:events'
import { execFileSync, spawn } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import pg from 'pg'
import argon2 from 'argon2'

const inspect = (name) => JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8' }))[0]
const digest = (value) => createHash('sha256').update(value).digest('hex')
const normalFingerprint = (container) => digest(JSON.stringify({ id: container.Id, config: container.Config, mounts: container.Mounts, ports: container.HostConfig.PortBindings }))
const envFingerprint = () => {
  try { return digest(readFileSync(new URL('../.env', import.meta.url))) } catch (error) { if (error.code === 'ENOENT') return null; throw error }
}

// Native CDP only observes HTTP; Fetch.enable/interception is deliberately absent.
async function openBrave() {
  const executable = process.env.BRAVE_PATH || join(process.env.LOCALAPPDATA, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')
  assert.ok(existsSync(executable), 'Brave must already be installed; this runner installs nothing')
  assert.match(executable, /brave\.exe$/i)
  const profile = await mkdtemp(join(process.env.LOCALAPPDATA, 'Temp', 'opencode', 'family-real-qa-'))
  const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] })
  let socket
  try {
    const endpoint = await new Promise((resolve, reject) => {
      let output = ''
      browser.stderr.on('data', (data) => {
        output += data
        const match = /DevTools listening on (ws:\/\/[^\s]+)/.exec(output)
        if (match) resolve(match[1])
      })
      browser.on('error', reject)
      browser.on('exit', () => reject(new Error('Brave exited before CDP became available')))
    })
    socket = new WebSocket(endpoint)
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
    let sequence = 0
    const pending = new Map()
    const events = new Map()
    function send(method, params = {}, sessionId) {
      const id = ++sequence
      const result = new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
      socket.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }))
      return result
    }
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data)
      if (message.id) {
        const request = pending.get(message.id)
        pending.delete(message.id)
        if (message.error) request?.reject(new Error(message.error.message))
        else request?.resolve(message.result)
      } else events.get(message.method)?.(message.params)
    }
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    const command = (method, params = {}) => send(method, params, sessionId)
    const evaluate = async (expression) => {
      const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      // Do not print evaluated expressions: login expressions contain ephemeral secrets.
      if (result.exceptionDetails) throw new Error(`Browser evaluation failed: ${result.exceptionDetails.exception?.description?.split('\n')[0] || 'unknown error'} (expression omitted)`)
      return result.result.value
    }
    const wait = async (expression) => {
      for (let attempt = 0; attempt < 200; attempt++) {
        if (await evaluate(expression)) return
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      const diagnostic = await evaluate("({ path:location.pathname, online:navigator.onLine, ready:document.readyState, buttons:[...document.querySelectorAll('main button')].map(b=>({text:b.textContent.trim(),disabled:b.disabled})), alerts:[...document.querySelectorAll('main [role=alert]')].map(el=>el.innerText) })")
      throw new Error(`Browser condition timed out: ${expression}; sanitized state: ${JSON.stringify(diagnostic)}`)
    }
    const click = (text) => evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)}); if (!button || button.disabled) throw new Error('Button unavailable'); button.click(); })()`)
    const fill = (id, value) => evaluate(`(() => { const el = document.getElementById(${JSON.stringify(id)}); if (!el) throw new Error('Missing control'); const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); })()`)
    await command('Page.enable')
    await command('Network.enable')
    await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
    return { command, evaluate, wait, click, fill, events, close: async () => { await send('Browser.close').catch(() => {}); socket.close(); browser.kill() } }
  } catch (error) {
    socket?.close()
    browser.kill()
    throw error
  }
}

test('real family wizard / Brave / isolated PostgreSQL QA', { skip: process.env.RUN_FAMILY_WIZARD_REAL_QA !== 'true', timeout: 180000 }, async (t) => {
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
  const containers = JSON.parse(execFileSync('docker', ['inspect', ...ids], { encoding: 'utf8' }))
  assert.deepEqual(containers.filter((container) => container.Mounts.some((mount) => mount.Source === volume.Source)).map((container) => container.Id), [qa.Id])
  const normalBefore = normalFingerprint(normal)
  const envBefore = envFingerprint()
  assert.ok(process.env.QA_PASSWORD_FILE, 'Provide the QA password file path; never print its contents')
  const password = readFileSync(process.env.QA_PASSWORD_FILE, 'utf8').trim()
  assert.ok(password)
  // Fixed destination: no externally supplied DATABASE_URL can redirect this runner.
  const connectionString = `postgresql://viviendas_qa:${encodeURIComponent(password)}@127.0.0.1:5433/viviendas_leon_qa`
  const sql = new pg.Client({ connectionString, application_name: 'qa_family_wizard_brave', options: '-c default_transaction_read_only=on' })
  await sql.connect().catch(() => { throw new Error('Cannot connect to the authorized QA destination (credentials omitted)') })
  let api
  let vite
  let brave
  let prisma
  let transactionOriginal
  let disconnectNextPost = false
  let disconnectedBrowserPosts = 0
  const prefix = `QA_WIZARD_${new Date().toISOString().slice(0, 10).replaceAll('-', '')}_${randomUUID()}`
  const manifest = { prefix, usuarios: [], municipios: [], comunidades: [], programas: [], familias: [], offlineOperations: [] }
  const baseline = new Map()
  let preserved = false
  let runtimeError
  async function verifyPreservation() {
    for (const [table, expected] of baseline) {
      const actual = (await sql.query(`SELECT md5(row_to_json(t)::text) AS fingerprint FROM public."${table}" t`)).rows.map((row) => row.fingerprint)
      const frequencies = new Map()
      for (const value of actual) frequencies.set(value, (frequencies.get(value) ?? 0) + 1)
      for (const value of expected) {
        assert.ok(frequencies.get(value) > 0, `Preexisting row changed or removed in ${table}; row values omitted`)
        frequencies.set(value, frequencies.get(value) - 1)
      }
    }
    assert.equal(normalFingerprint(inspect('viviendas-leon-postgres')), normalBefore)
    assert.equal(envFingerprint(), envBefore)
    preserved = true
  }
  try {
    const identity = (await sql.query("SELECT current_database() AS database, current_user AS username, inet_server_port() AS port, current_setting('transaction_read_only') AS read_only, version() AS version")).rows[0]
    assert.equal(identity.database, 'viviendas_leon_qa')
    assert.equal(identity.username, 'viviendas_qa')
    assert.equal(identity.port, 5432)
    assert.equal(identity.read_only, 'on')
    assert.match(identity.version, /^PostgreSQL 17\./)
    console.log('Verified QA isolation:', JSON.stringify({ container: qa.Name, volume: volume.Name, host: '127.0.0.1', publishedPort: 5433, database: identity.database, username: identity.username, internalPort: identity.port, exclusiveVolume: true }))
    const tables = (await sql.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map((row) => row.tablename)
    for (const table of tables) {
      assert.match(table, /^[a-zA-Z_][a-zA-Z_0-9]*$/)
      // Fingerprints only: failures cannot expose preexisting personal rows/hashes.
      baseline.set(table, (await sql.query(`SELECT md5(row_to_json(t)::text) AS fingerprint FROM public."${table}" t`)).rows.map((row) => row.fingerprint))
    }
    process.env.DATABASE_URL = connectionString
    process.env.SESSION_SECRET = randomBytes(48).toString('hex')
    process.env.NODE_ENV = 'qa'
    process.env.ENABLE_FAMILY_INTEGRAL_API = 'true'
    process.env.ENABLE_OFFLINE_DEMO_SYNC = 'false'
    process.env.VITE_API_URL = '/api'
    const { app } = await import('../dist/app.js')
    const { getPrismaClient } = await import('../dist/config/prisma.js')
    prisma = getPrismaClient()
    const effective = await prisma.$queryRaw`SELECT current_database() AS database, current_user AS username, inet_server_port() AS port`
    assert.equal(effective[0].database, identity.database)
    assert.equal(effective[0].username, identity.username)
    assert.equal(effective[0].port, identity.port)
    assert.equal(process.env.DATABASE_URL, connectionString)
    await sql.query('SET default_transaction_read_only = off')
    const syntheticUsers = (await sql.query("SELECT count(*)::int AS count FROM usuario WHERE correo LIKE 'qa%@example.invalid' AND estado='ACTIVO'")).rows[0].count
    console.log('Existing active synthetic QA accounts:', syntheticUsers)
    // Never reset an existing user's credentials. Every run owns its unique account.
    const email = `qa-wizard-${randomUUID()}@example.invalid`
    const accountPassword = randomBytes(32).toString('base64url')
    const passwordHash = await argon2.hash(accountPassword)
    const user = (await sql.query('INSERT INTO usuario (nombre, correo, password_hash, estado, fecha_creacion) VALUES ($1,$2,$3,$4,now()) RETURNING id', [`${prefix} USER`, email, passwordHash, 'ACTIVO'])).rows[0]
    manifest.usuarios.push(user.id)
    const municipality = (await sql.query('INSERT INTO municipio (nombre, activo) VALUES ($1,true) RETURNING id', [`${prefix} MUNICIPALITY`])).rows[0]
    manifest.municipios.push(municipality.id)
    const community = (await sql.query('INSERT INTO comunidad (municipio_id,nombre,activo) VALUES ($1,$2,true) RETURNING id', [municipality.id, `${prefix} COMMUNITY`])).rows[0]
    manifest.comunidades.push(community.id)
    let programs = (await sql.query("SELECT id,nombre FROM programa WHERE estado='ACTIVO' ORDER BY nombre,id LIMIT 2")).rows
    for (let index = programs.length; index < 2; index++) {
      const program = (await sql.query('INSERT INTO programa (nombre,descripcion,estado) VALUES ($1,$2,$3) RETURNING id,nombre', [`${prefix} PROGRAM ${index}`, 'Synthetic wizard QA only', 'ACTIVO'])).rows[0]
      manifest.programas.push(program.id)
      programs.push(program)
    }
    // Actual Express app. No HTTP response is replaced or mocked.
    let receivedIntegralPosts = 0
    api = createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/api/v1/familias/registro-integral') {
        receivedIntegralPosts++
      }
      app(req, res)
    })
    api.listen(0, '127.0.0.1')
    await once(api, 'listening')
    const apiUrl = `http://127.0.0.1:${api.address().port}`
    // Generated Prisma currently publishes a global __dirname. In this combined
    // test process that confuses ESM plugins resolving their own package paths.
    // Remove that test-process global; do not edit generated/client or app code.
    delete globalThis.__dirname
    const { createServer: createViteServer } = await import('vite')
    const root = fileURLToPath(new URL('../../web/', import.meta.url))
    vite = await createViteServer({ root, configFile: join(root, 'vite.config.ts'), mode: 'qa', plugins: [{
      name: 'qa-transport-disconnect',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (disconnectNextPost && req.method === 'POST' && req.url === '/api/v1/familias/registro-integral') {
            disconnectNextPost = false
            disconnectedBrowserPosts++
            req.socket.destroy()
            return
          }
          next()
        })
      },
    }], server: { host: '127.0.0.1', port: 0, strictPort: true, proxy: { '/api': { target: apiUrl, changeOrigin: true } } } })
    await vite.listen()
    const base = `http://127.0.0.1:${vite.httpServer.address().port}`
    brave = await openBrave()
    const { command, evaluate, wait, click, fill } = brave
    const httpResponses = []
    const integralRequests = []
    brave.events.set('Network.responseReceived', ({ response }) => {
      const path = new URL(response.url).pathname
      if (path.startsWith('/api/')) httpResponses.push({ path, status: response.status })
    })
    brave.events.set('Network.requestWillBeSent', ({ request }) => {
      const path = new URL(request.url).pathname
      if (path === '/api/v1/familias/registro-integral' && request.method === 'POST') integralRequests.push(path)
    })
    const navigate = async (path) => { await command('Page.navigate', { url: `${base}${path}` }) }
    const browserRequest = (path, body) => evaluate(`(async () => { const response = await fetch(${JSON.stringify(path)}, ${body === undefined ? "{ credentials: 'same-origin', cache: 'no-store' }" : JSON.stringify({ method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })}); return { status: response.status, body: await response.json() }; })()`)
    const login = async () => {
      await navigate('/login')
      await wait("document.getElementById('correo') !== null")
      await fill('correo', email)
      await fill('password', accountPassword)
      await click('Iniciar sesión')
      await wait("location.pathname === '/' && document.querySelector('main#main-content') !== null")
    }
    const familyCount = async (name) => (await sql.query('SELECT count(*)::int AS count FROM familia WHERE nombre_referencia=$1', [name])).rows[0].count
    const completeSingleDraft = async (suffix) => {
      await navigate('/familias/nueva')
      await wait("document.getElementById('wizard-nombreReferencia') !== null")
      await fill('wizard-nombreReferencia', `${prefix} ${suffix}`)
      await fill('wizard-comunidadId', String(community.id))
      await fill('wizard-fechaIngreso', '2026-10-14')
      await click('Continuar')
      await fill('wizard-integrantes.member-1.nombreCompleto', `${prefix} PERSON`)
      await fill('wizard-integrantes.member-1.fechaNacimiento', '2000-01-15')
      await fill('wizard-integrantes.member-1.sexo', 'Femenino')
      await fill('wizard-integrantes.member-1.parentesco', 'Madre')
      await click('Continuar')
      await wait("document.getElementById('wizard-programas.program-2.programaId') !== null")
      await fill('wizard-programas.program-2.programaId', String(programs[0].id))
      await click('Continuar')
      await wait("document.body.innerText.includes('Paso 4 de 4')")
    }

    await t.test('real login, session cookie, PostgreSQL session and catalogs', async () => {
      await login()
      const me = await browserRequest('/api/v1/auth/me')
      assert.equal(me.status, 200)
      assert.equal(me.body.usuario.id, user.id)
      const cookies = (await command('Network.getCookies', { urls: [base] })).cookies
      const cookie = cookies.find((item) => item.name === 'viviendas_leon.sid')
      assert.ok(cookie?.httpOnly)
      assert.equal(cookie.sameSite, 'Lax')
      const stored = (await sql.query("SELECT count(*)::int AS count FROM session WHERE (sess->>'userId')::int=$1", [user.id])).rows[0].count
      assert.equal(stored, 1)
      assert.ok((await sql.query('SELECT ultimo_acceso FROM usuario WHERE id=$1', [user.id])).rows[0].ultimo_acceso)
      const communities = await browserRequest('/api/v1/comunidades')
      const options = await browserRequest('/api/v1/familias/opciones/programas')
      assert.equal(communities.status, 200)
      assert.equal(options.status, 200)
      assert.ok(communities.body.data.some((item) => item.id === community.id && item.municipio.id === municipality.id))
      assert.ok(programs.every((program) => options.body.data.some((item) => item.id === program.id)))
    })

    const name = `${prefix} MULTIPLE`
    let familyId
    await t.test('four steps, mandatory rows, multiple members/programs, preservation and summary', async () => {
      await navigate('/familias/nueva')
      await wait("document.getElementById('wizard-nombreReferencia') !== null")
      await fill('wizard-nombreReferencia', name)
      await fill('wizard-comunidadId', String(community.id))
      await fill('wizard-fechaIngreso', '2026-10-14')
      await fill('wizard-observaciones', 'Synthetic real QA family notes')
      assert.equal(await evaluate("document.getElementById('wizard-municipio').value"), `${prefix} MUNICIPALITY`)
      await click('Continuar')
      await click('Continuar')
      await wait("document.activeElement?.id === 'wizard-integrantes.member-1.nombreCompleto'")
      await fill('wizard-integrantes.member-1.nombreCompleto', `${prefix} PERSON ONE`)
      await fill('wizard-integrantes.member-1.fechaNacimiento', '2000-01-15')
      await fill('wizard-integrantes.member-1.sexo', 'Femenino')
      await fill('wizard-integrantes.member-1.parentesco', 'Madre')
      await fill('wizard-integrantes.member-1.telefono', '00000000')
      await fill('wizard-integrantes.member-1.observaciones', 'Synthetic member notes')
      await click('Agregar integrante')
      await fill('wizard-integrantes.member-3.nombreCompleto', `${prefix} PERSON TWO`)
      await fill('wizard-integrantes.member-3.fechaNacimiento', '2001-02-28')
      await fill('wizard-integrantes.member-3.sexo', 'Masculino')
      await fill('wizard-integrantes.member-3.parentesco', 'Hijo')
      await click('Anterior')
      assert.equal(await evaluate("document.getElementById('wizard-observaciones').value"), 'Synthetic real QA family notes')
      await click('Continuar')
      assert.equal(await evaluate("document.getElementById('wizard-integrantes.member-3.nombreCompleto').value"), `${prefix} PERSON TWO`)
      await click('Continuar')
      await wait("document.getElementById('wizard-programas.program-2.programaId') !== null")
      await click('Continuar')
      await wait("document.activeElement?.id === 'wizard-programas.program-2.programaId'")
      await fill('wizard-programas.program-2.programaId', String(programs[0].id))
      await fill('wizard-programas.program-2.fechaIngreso', '2026-10-14')
      await fill('wizard-programas.program-2.observaciones', 'Synthetic program notes')
      await click('Agregar programa')
      assert.equal(await evaluate(`document.querySelector('[id="wizard-programas.program-4.programaId"] option[value="${programs[0].id}"]').disabled`), true)
      await fill('wizard-programas.program-4.programaId', String(programs[1].id))
      await click('Continuar')
      await wait("document.body.innerText.includes('Paso 4 de 4')")
      for (const value of [name, `${prefix} PERSON ONE`, `${prefix} PERSON TWO`, programs[0].nombre, programs[1].nombre, '2000-01-15', 'Synthetic member notes', 'Synthetic program notes']) assert.equal(await evaluate(`document.querySelector('main').innerText.includes(${JSON.stringify(value)})`), true)
      assert.equal(integralRequests.length, 0)
    })

    await t.test('double click: one real POST, HTTP 201, PostgreSQL content and redirect', async () => {
      const before = receivedIntegralPosts
      await evaluate("(() => { const button = [...document.querySelectorAll('button')].find(b => b.textContent === 'Confirmar y registrar'); button.click(); button.click(); })()")
      await wait("/^\\/familias\\/\\d+$/.test(location.pathname)")
      familyId = Number(await evaluate("location.pathname.split('/').at(-1)"))
      manifest.familias.push(familyId)
      assert.equal(receivedIntegralPosts - before, 1)
      assert.equal(integralRequests.length, 1)
      assert.ok(httpResponses.some((item) => item.path.endsWith('/registro-integral') && item.status === 201))
      assert.equal(await familyCount(name), 1)
      const family = (await sql.query('SELECT id,comunidad_id,nombre_referencia,fecha_ingreso::text,estado,observaciones FROM familia WHERE id=$1', [familyId])).rows[0]
      assert.equal(family.comunidad_id, community.id)
      assert.equal(family.nombre_referencia, name)
      assert.equal(family.fecha_ingreso, '2026-10-14')
      assert.equal(family.estado, 'ACTIVA')
      assert.equal(family.observaciones, 'Synthetic real QA family notes')
      const members = (await sql.query('SELECT nombre_completo,fecha_nacimiento::text,telefono,observaciones,activo FROM integrante_familia WHERE familia_id=$1 ORDER BY id', [familyId])).rows
      assert.equal(members.length, 2)
      assert.equal(members[0].nombre_completo, `${prefix} PERSON ONE`)
      assert.equal(members[0].fecha_nacimiento, '2000-01-15')
      assert.equal(members[0].telefono, '00000000')
      assert.equal(members[1].nombre_completo, `${prefix} PERSON TWO`)
      assert.ok(members.every((item) => item.activo))
      const associations = (await sql.query('SELECT programa_id,fecha_ingreso::text,estado FROM familia_programa WHERE familia_id=$1 ORDER BY programa_id', [familyId])).rows
      assert.deepEqual(associations.map((item) => item.programa_id), programs.map((item) => item.id).sort((a, b) => a - b))
      assert.ok(associations.every((item) => item.estado === null))
      console.log('Real wizard persistence:', JSON.stringify({ familyId, communityId: community.id, memberCount: members.length, programIds: associations.map((item) => item.programa_id), matchingNameCount: 1, integralPosts: 1, httpStatus: 201 }))
    })

    await t.test('reload, basic and integral record read after commit', async () => {
      await command('Page.reload')
      await wait(`document.querySelector('main')?.innerText.includes(${JSON.stringify(name)})`)
      const basic = await browserRequest(`/api/v1/familias/${familyId}`)
      const full = await browserRequest(`/api/v1/familias/${familyId}/expediente`)
      assert.equal(basic.status, 200)
      assert.equal(basic.body.data.id, familyId)
      assert.equal(full.status, 200)
      assert.equal(full.body.data.integrantes.length, 2)
      assert.equal(full.body.data.programas.length, 2)
    })

    await t.test('real 400: changed QA community, focus, preserved draft and recovery', async () => {
      await completeSingleDraft('VALIDATION RECOVERY')
      await sql.query('UPDATE comunidad SET activo=false WHERE id=$1', [community.id])
      try {
        await click('Confirmar y registrar')
        await wait("document.activeElement?.id === 'wizard-comunidadId' && document.body.innerText.includes('Paso 1 de 4')")
        assert.equal(await evaluate("document.getElementById('wizard-nombreReferencia').value"), `${prefix} VALIDATION RECOVERY`)
        assert.equal(await familyCount(`${prefix} VALIDATION RECOVERY`), 0)
        assert.ok(httpResponses.some((item) => item.path.endsWith('/registro-integral') && item.status === 400))
      } finally { await sql.query('UPDATE comunidad SET activo=true WHERE id=$1', [community.id]) }
      await click('Continuar')
      await click('Continuar')
      await click('Continuar')
      await wait("document.body.innerText.includes('Paso 4 de 4')")
    })

    await t.test('real 500 with PostgreSQL rollback', async () => {
      transactionOriginal = prisma.$transaction
      const originalLog = console.error
      let injected = false
      // Test-only dependency injection, real writes followed by an intentional
      // failure inside the transaction. No production switch or mocked HTTP.
      prisma.$transaction = (callback) => transactionOriginal.call(prisma, async (tx) => {
        await callback(tx)
        injected = true
        throw new Error('Controlled QA rollback')
      })
      console.error = () => {}
      try {
        await click('Confirmar y registrar')
        await wait("document.body.innerText.includes('El servidor no pudo completar') && document.activeElement?.id === 'wizard-submission-error'")
        assert.equal(injected, true)
        assert.equal(await familyCount(`${prefix} VALIDATION RECOVERY`), 0)
        assert.ok(httpResponses.some((item) => item.path.endsWith('/registro-integral') && item.status === 500))
      } finally { prisma.$transaction = transactionOriginal; transactionOriginal = undefined; console.error = originalLog }
    })

    await t.test('retry after resolved 400/404/500 creates the preserved draft once', async () => {
      await click('Confirmar y registrar')
      await wait("/^\\/familias\\/\\d+$/.test(location.pathname)")
      const recoveredId = Number(await evaluate("location.pathname.split('/').at(-1)"))
      manifest.familias.push(recoveredId)
      assert.equal(await familyCount(`${prefix} VALIDATION RECOVERY`), 1)
      assert.equal((await sql.query('SELECT count(*)::int AS count FROM integrante_familia WHERE familia_id=$1', [recoveredId])).rows[0].count, 1)
      assert.equal((await sql.query('SELECT count(*)::int AS count FROM familia_programa WHERE familia_id=$1', [recoveredId])).rows[0].count, 1)
    })

    await t.test('real session expiry: 401 before POST, draft kept, real relogin', async () => {
      await completeSingleDraft('EXPIRED SESSION')
      assert.equal((await browserRequest('/api/v1/auth/logout', {})).status, 200)
      const before = receivedIntegralPosts
      await click('Confirmar y registrar')
      await wait("document.body.innerText.includes('ha expirado') && document.activeElement?.id === 'wizard-submission-error'")
      assert.equal(receivedIntegralPosts, before)
      assert.equal(await evaluate(`document.querySelector('main').innerText.includes(${JSON.stringify(`${prefix} PERSON`)})`), true)
      assert.equal((await browserRequest('/api/v1/auth/me')).status, 401)
      await login()
    })

    await t.test('real transport interruption: uncertain result, no automatic retry or duplicate', async () => {
      await completeSingleDraft('UNCERTAIN')
      const before = receivedIntegralPosts
      disconnectNextPost = true
      await click('Confirmar y registrar')
      await wait("document.body.innerText.includes('podría haberse guardado')")
      assert.equal(await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent === 'Confirmar y registrar').disabled"), true)
      await new Promise((resolve) => setTimeout(resolve, 500))
      assert.equal(receivedIntegralPosts - before, 0)
      assert.equal(disconnectedBrowserPosts, 1)
      assert.equal(await familyCount(`${prefix} UNCERTAIN`), 0)
    })

    await t.test('real list, search, filters and pagination through UI and HTTP', async () => {
      await navigate('/familias')
      await wait("document.getElementById('family-search') !== null && document.querySelector('#family-results')?.getAttribute('aria-busy') === 'false'")
      await fill('family-search', prefix.slice(0, 100))
      await click('Buscar')
      await wait(`document.querySelector('#family-results')?.innerText.includes(${JSON.stringify(name)})`)
      await fill('family-status', 'RETIRADA')
      await wait("document.body.innerText.includes('No se encontraron familias')")
      await fill('family-status', 'ACTIVA')
      await wait(`document.querySelector('#family-results')?.innerText.includes(${JSON.stringify(name)})`)
      await click('Limpiar')
      await wait("document.body.innerText.includes('Página 1 de') && document.querySelector('#family-results')?.getAttribute('aria-busy') === 'false'")
      await click('Siguiente')
      await wait("document.body.innerText.includes('Página 2 de') && document.querySelector('#family-results')?.getAttribute('aria-busy') === 'false'")
      const one = await browserRequest(`/api/v1/familias?search=${encodeURIComponent(name)}&estado=ACTIVA&page=1&limit=1`)
      assert.equal(one.status, 200)
      assert.equal(one.body.pagination.total, 1)
      assert.equal(one.body.data[0].id, familyId)
    })

    await t.test('Sidebar and other module routes smoke checks', async () => {
      for (const [path, title] of [['/visitas/agenda', 'Agenda de visitas'], ['/visitas/nueva', 'Registrar visita técnica'], ['/gestion-agricola/huertos', 'Huertos'], ['/actividades', 'Actividades de campo'], ['/offline-queue-test', 'Prueba de cola offline']]) {
        await navigate(path)
        await wait(`document.querySelector('main')?.innerText.includes(${JSON.stringify(title)})`)
        assert.equal(await evaluate("document.querySelector('aside') !== null"), true)
      }
      const initialWidth = await evaluate("document.getElementById('app-sidebar').getBoundingClientRect().width")
      await evaluate("document.getElementById('sidebar-toggle').click()")
      await evaluate('new Promise(resolve => setTimeout(resolve, 350))')
      assert.notEqual(await evaluate("document.getElementById('app-sidebar').getBoundingClientRect().width"), initialWidth)
      await evaluate("document.getElementById('sidebar-toggle').click()")
      await evaluate('new Promise(resolve => setTimeout(resolve, 350))')
      await evaluate("document.querySelector('aside a[href=\"/familias\"]').click()")
      await wait("location.pathname === '/familias' && document.getElementById('family-search') !== null")
    })

    await t.test('existing offline IndexedDB cache works while network is offline', async () => {
      await navigate('/offline-test')
      await wait("document.body.innerText.includes('Prueba de consulta offline')")
      await wait("[...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Consultar información' && !b.disabled)")
      await click('Consultar información')
      await wait("document.body.innerText.includes('datos de prueba cargados con conexión')")
      await command('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
      try {
        await wait("document.body.innerText.includes('Sin conexión')")
        await click('Consultar información')
        await wait("document.body.innerText.includes('Origen: copia local (IndexedDB)')")
      } finally { await command('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }) }
    })

    let offlineOperationId
    await t.test('existing offline queue: UI creation without network, retained failure and retryability', async () => {
      await navigate('/offline-operations-test')
      await wait("document.getElementById('offline-title') !== null")
      await wait("[...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Guardar operación local' && !b.disabled)")
      await evaluate("(async () => { window.__qaQueue = await import('/src/services/pendingOperations.ts'); window.__qaSync = await import('/src/services/offlineSync.ts'); window.__qaConnection = await import('/src/services/connectivity.ts'); })()")
      await command('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
      try {
        await wait("document.body.innerText.includes('Sin conexión')")
        await fill('offline-title', 'QA WIZARD OFFLINE NOTE')
        await fill('offline-observation', `${prefix} SYNTHETIC OFFLINE NOTE`)
        await click('Guardar operación local')
        await wait("document.body.innerText.includes('Operación guardada localmente')")
        const queued = await evaluate("(async () => (await window.__qaQueue.listQueueOperations()).map(({id,status,attempts}) => ({id,status,attempts})))()")
        assert.equal(queued.length, 1)
        assert.equal(queued[0].status, 'pending')
        offlineOperationId = queued[0].id
        const failed = await evaluate(`(async () => { const row = await window.__qaQueue.processQueueOperation(${JSON.stringify(offlineOperationId)}, async () => { throw new Error('QA synthetic processor failure') }); return {status:row.status, attempts:row.attempts}; })()`)
        assert.equal(failed.status, 'failed')
        assert.equal(failed.attempts, 1)
      } finally { await command('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }) }
    })

    await t.test('existing offline real sync and UUID deduplication, when QA table is present', async (context) => {
      const table = (await sql.query("SELECT to_regclass('public.offline_demo_note')::text AS name")).rows[0].name
      if (!table) { context.skip('QA lacks offline_demo_note; no migration is authorized or needed for families'); return }
      process.env.ENABLE_OFFLINE_DEMO_SYNC = 'true'
      try {
        await wait("window.__qaConnection.getConnectivitySnapshot().status === 'connected'")
        await evaluate("window.__qaSync.syncDemoPendingOperations()")
        const operation = await evaluate(`(async () => (await window.__qaQueue.listQueueOperations()).find(row => row.id === ${JSON.stringify(offlineOperationId)}))()`)
        assert.equal(operation.status, 'synced')
        assert.equal(operation.syncSource, 'server')
        assert.equal((await sql.query('SELECT count(*)::int AS count FROM offline_demo_note WHERE operation_id=$1::uuid', [offlineOperationId])).rows[0].count, 1)
        assert.equal(await evaluate(`(async () => { const row = (await window.__qaQueue.listQueueOperations()).find(row => row.id === ${JSON.stringify(offlineOperationId)}); return window.__qaSync.verifyServerDeduplication(row); })()`), true)
        assert.equal((await sql.query('SELECT count(*)::int AS count FROM offline_demo_note WHERE operation_id=$1::uuid', [offlineOperationId])).rows[0].count, 1)
        manifest.offlineOperations.push(offlineOperationId)
      } finally { delete process.env.ENABLE_OFFLINE_DEMO_SYNC }
    })

    await t.test('real logout clears session and ProtectedRoute redirects', async () => {
      await evaluate("document.querySelector('[aria-label=\"Abrir menú de usuario\"]').click()")
      await click('Cerrar sesión')
      await wait("location.pathname === '/login' && document.getElementById('correo') !== null")
      assert.equal((await browserRequest('/api/v1/auth/me')).status, 401)
      await navigate('/familias')
      await wait("location.pathname === '/login' && document.getElementById('correo') !== null")
      assert.equal((await sql.query("SELECT count(*)::int AS count FROM session WHERE (sess->>'userId')::int=$1", [user.id])).rows[0].count, 0)
    })

    await t.test('all preexisting public rows, N01, prior QA, normal container and .env unchanged', verifyPreservation)
    console.log('Real HTTP status evidence:', JSON.stringify([...new Set(httpResponses.map((item) => `${item.path.includes('/auth/') ? 'AUTH' : item.path.endsWith('/registro-integral') ? 'INTEGRAL_POST' : 'CATALOG_OR_READ'}:${item.status}`))].sort()))
  } catch (error) {
    runtimeError = error
    throw error
  } finally {
    if (transactionOriginal && prisma) prisma.$transaction = transactionOriginal
    // Restore only this runner's own fixture even when an assertion fails.
    if (manifest.comunidades.length) await sql.query('UPDATE comunidad SET activo=true WHERE id=$1', [manifest.comunidades[0]])
    process.env.ENABLE_FAMILY_INTEGRAL_API = 'true'
    try { if (baseline.size) await verifyPreservation() } finally {
      console.log('Retained synthetic QA IDs:', JSON.stringify({ ...manifest, preexistingRowsPreserved: preserved, normalEnvironmentUnchanged: normalFingerprint(inspect('viviendas-leon-postgres')) === normalBefore, harnessException: Boolean(runtimeError) }))
      if (brave) await brave.close()
      if (vite) await vite.close()
      if (api) { api.closeAllConnections(); await new Promise((resolve) => api.close(resolve)) }
      if (prisma) await prisma.$disconnect()
      await sql.end()
    }
  }
})
