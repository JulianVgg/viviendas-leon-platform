import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatRecordDate, familyStateVariant, recordFailure } from '../src/features/families/services/familyRecord.ts'

test('record dates use es-GT and UTC, without moving a PostgreSQL date', () => {
  assert.equal(formatRecordDate('2000-01-15T00:00:00.000Z'), '15/01/2000')
  assert.equal(formatRecordDate('2026-10-14T00:00:00.000Z'), '14/10/2026')
})
test('null, absent and malformed dates never render Invalid Date', () => {
  for (const value of [null, undefined, '']) assert.equal(formatRecordDate(value), 'Sin fecha')
  assert.equal(formatRecordDate('not-a-date'), 'Fecha no disponible')
})
test('family badges retain established states, without inventing participation states', () => {
  assert.equal(familyStateVariant('ACTIVA'), 'success')
  assert.equal(familyStateVariant('RETIRADA'), 'warning')
  assert.equal(familyStateVariant('EGRESADA'), 'neutral')
  assert.equal(familyStateVariant('UNKNOWN'), 'neutral')
})
for (const [status, code, kind, retry] of [
  [400, 'VALIDATION_ERROR', 'invalid', false],
  [401, 'UNAUTHORIZED', 'session', false],
  [403, 'FORBIDDEN', 'denied', false],
  [404, 'FAMILY_NOT_FOUND', 'missing', false],
  [404, 'NOT_FOUND', 'disabled', true],
  [404, undefined, 'unavailable', true],
  [500, 'FAMILY_INTEGRAL_DETAIL_ERROR', 'server', true],
  [undefined, undefined, 'network', true],
]) test(`record error ${status}/${code}: ${kind}`, () => {
  assert.equal(recordFailure(status, code).kind, kind)
  assert.equal(recordFailure(status, code).retry, retry)
})

test('Brave record UI: real DOM, mocked HTTP, read-only tabs, errors, privacy and responsive', { skip: process.env.RUN_FAMILY_RECORD_BROWSER !== 'true', timeout: 120000 }, async () => {
  const { spawn } = await import('node:child_process')
  const { mkdtemp } = await import('node:fs/promises')
  const { join } = await import('node:path')
  const profile = await mkdtemp(join(process.env.LOCALAPPDATA, 'Temp', 'opencode', 'family-record-mock-'))
  const executable = process.env.BRAVE_PATH || join(process.env.LOCALAPPDATA, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')
  const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] })
  let socket
  try {
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
        if (message.error) request?.reject(new Error(message.error.message)); else request?.resolve(message.result)
      } else events.get(message.method)?.(message.params)
    }
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    const command = (method, params = {}) => send(method, params, sessionId)
    const evaluate = async (expression) => {
      const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description?.split('\n')[0] || 'Browser evaluation failed')
      return result.result.value
    }
    const wait = async (expression) => {
      for (let attempt = 0; attempt < 200; attempt++) {
        if (await evaluate(expression)) return
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      throw new Error(`Record UI timeout: ${expression}`)
    }
    const key = async (name, code) => {
      await command('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, windowsVirtualKeyCode: code })
      await command('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: code })
    }
    const selectTab = async (index) => {
      await evaluate(`document.querySelectorAll('[role=tab]')[${index}].click()`)
      await wait(`document.querySelectorAll('[role=tab]')[${index}]?.getAttribute('aria-selected') === 'true'`)
    }
    const fixture = {
      id: 42, nombreReferencia: `QA_RECORD_${'A'.repeat(140)}`, estado: 'RETIRADA', fechaIngreso: '2026-10-14T00:00:00.000Z',
      observaciones: 'QA OBSERVACIONES EXTENSAS\n'.repeat(70), comunidad: { id: 10, nombre: `QA COMMUNITY ${'B'.repeat(250)}`, municipio: { id: 11, nombre: 'QA MUNICIPALITY' } },
      integrantes: [
        { id: 21, nombreCompleto: `QA PERSON ${'C'.repeat(500)}`, fechaNacimiento: '2000-01-15T00:00:00.000Z', sexo: 'QA', parentesco: 'QA PARENTESCO', telefono: '00012345', observaciones: null, activo: true },
        { id: 22, nombreCompleto: 'QA PERSON TWO', fechaNacimiento: null, sexo: null, parentesco: null, telefono: null, observaciones: null, activo: false },
      ],
      programas: [
        { id: 901, programaId: 71, programa: { id: 71, nombre: `QA PROGRAM ${'D'.repeat(400)}` }, fechaIngreso: '2026-10-14T00:00:00.000Z', fechaSalida: null, estado: null, observaciones: 'QA PROGRAM NOTES '.repeat(120) },
        { id: 902, programaId: 72, programa: { id: 72, nombre: 'QA PROGRAM TWO' }, fechaIngreso: null, fechaSalida: '2026-10-15T00:00:00.000Z', estado: 'QA CUSTOM VALUE', observaciones: null },
      ],
    }
    let mode = { status: 200 }
    let empty = false
    const requests = []
    const failures = []
    events.set('Fetch.requestPaused', (event) => {
      void (async () => {
        const path = new URL(event.request.url).pathname
        requests.push({ path, method: event.request.method })
        let status = 200
        let payload
        if (path === '/api/v1/auth/me') payload = { usuario: { id: 1, nombre: 'QA USER', correo: 'qa@example.invalid', roles: [], permisos: [] } }
        else if (path === '/api/health') payload = { status: 'ok', service: 'viviendas-leon-api' }
        else if (/\/familias\/[^/]+\/expediente$/.test(path)) {
          const currentMode = { ...mode }
          const record = structuredClone(fixture)
          record.id = Number(path.split('/').at(-2))
          if (empty) { record.integrantes = []; record.programas = []; record.fechaIngreso = null; record.observaciones = null }
          await new Promise((resolve) => setTimeout(resolve, 180))
          if (currentMode.status === 'network') { await command('Fetch.failRequest', { requestId: event.requestId, errorReason: 'ConnectionFailed' }); return }
          status = currentMode.status
          payload = status === 200 ? { data: record } : { error: { code: currentMode.code, message: 'INTERNAL SQL SECRET MUST NOT APPEAR' } }
        } else { status = 404; payload = { error: { code: 'NOT_FOUND' } } }
        await command('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(payload)).toString('base64') })
      })().catch((error) => { if (error.message !== 'Invalid InterceptionId.') failures.push(error.message) })
    })
    await command('Fetch.enable', { patterns: [{ urlPattern: '*/api/*' }] })
    await command('Page.enable')
    const base = process.env.FAMILY_RECORD_URL || 'http://127.0.0.1:5174'
    const navigate = async (id = 42) => { await command('Page.navigate', { url: `${base}/familias/${id}` }) }
    const ready = () => wait("document.querySelector('[role=tablist]') !== null")
    await navigate()
    await wait("document.body.innerText.includes('Consultando expediente integral...')")
    await ready()
    assert.equal(await evaluate("document.querySelector('[aria-label=\"Resumen de integrantes\"]').innerText.includes('2')"), true)
    assert.equal(await evaluate("document.querySelector('[aria-label=\"Resumen de programas\"]').innerText.includes('2')"), true)
    assert.equal(await evaluate("document.querySelector('[aria-label=\"Identificación del expediente\"]').innerText.includes('RETIRADA')"), true)
    assert.equal(await evaluate("document.querySelector('[role=tabpanel]:not([hidden])').innerText.includes('14/10/2026')"), true)
    const associations = await evaluate("[...document.querySelectorAll('[role=tab]')].map(tab=>({selected:tab.getAttribute('aria-selected'),tabIndex:tab.tabIndex,linked:document.getElementById(tab.getAttribute('aria-controls'))?.getAttribute('aria-labelledby')===tab.id}))")
    assert.deepEqual(associations.map((item) => item.linked), [true, true, true])
    assert.deepEqual(associations.map((item) => item.tabIndex), [0, -1, -1])
    await evaluate("document.querySelector('[role=tab]').focus()")
    await key('ArrowRight', 39)
    await wait("document.activeElement?.textContent === 'Integrantes' && document.activeElement.getAttribute('aria-selected') === 'true'")
    assert.equal(await evaluate("document.querySelector('[role=tabpanel]:not([hidden]) tbody').rows.length"), 2)
    for (const text of ['15/01/2000', 'Sin fecha', 'Activo', 'Inactivo', '00012345']) assert.equal(await evaluate(`document.querySelector('[role=tabpanel]:not([hidden])').innerText.includes(${JSON.stringify(text)})`), true)
    await key('End', 35)
    await wait("document.activeElement?.textContent === 'Programas'")
    for (const text of ['Programa #71', 'Asociación #901', 'Sin estado definido', 'QA CUSTOM VALUE', '15/10/2026']) assert.equal(await evaluate(`document.querySelector('[role=tabpanel]:not([hidden])').innerText.includes(${JSON.stringify(text)})`), true)
    await key('ArrowRight', 39)
    await wait("document.activeElement?.textContent === 'Información general'")
    await key('ArrowLeft', 37)
    await wait("document.activeElement?.textContent === 'Programas'")
    await key('Home', 36)
    await key('Tab', 9)
    assert.equal(await evaluate("document.activeElement?.getAttribute('role')"), 'tabpanel')
    for (const width of [320, 375, 768, 1024, 1440]) {
      await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false })
      await evaluate('new Promise(resolve => setTimeout(resolve, 350))')
      for (const dark of [false, true]) {
        await evaluate(`document.documentElement.classList.toggle('dark', ${dark})`)
        for (const index of [0, 1, 2]) {
          await selectTab(index)
          assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `Global overflow: ${width}, dark=${dark}, tab=${index}`)
        }
      }
    }
    const stored = await evaluate("(async () => { const values=[...Object.values(localStorage),...Object.values(sessionStorage)]; for(const info of await indexedDB.databases()){const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(info.name);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});for(const store of db.objectStoreNames){const rows=await new Promise((resolve,reject)=>{const r=db.transaction(store,'readonly').objectStore(store).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});values.push(JSON.stringify(rows))}db.close()}return values.join(' ');})()")
    for (const marker of ['QA_RECORD_', '00012345', '2000-01-15', 'QA PERSON']) assert.equal(stored.includes(marker), false)
    assert.equal(requests.some((item) => item.method !== 'GET'), false)
    assert.equal(requests.some((item) => /^\/api\/v1\/familias\/\d+$/.test(item.path)), false, 'No fallback to basic GET')
    empty = true
    await navigate(43)
    await ready()
    assert.equal(await evaluate("document.querySelector('[aria-label=\"Resumen de integrantes\"]').innerText.includes('0')"), true)
    await selectTab(1)
    assert.equal(await evaluate("document.querySelector('[role=tabpanel]:not([hidden])').innerText.includes('Sin integrantes registrados')"), true)
    await selectTab(2)
    assert.equal(await evaluate("document.querySelector('[role=tabpanel]:not([hidden])').innerText.includes('Sin programas asociados')"), true)
    for (const [status, code, title] of [
      [400, 'VALIDATION_ERROR', 'Identificador no válido'], [401, 'UNAUTHORIZED', 'Sesión expirada o no válida'],
      [403, 'FORBIDDEN', 'Acceso denegado'], [404, 'FAMILY_NOT_FOUND', 'Expediente inexistente'],
      [404, 'NOT_FOUND', 'Servicio integral deshabilitado'], [404, 'OTHER', 'Servicio integral no disponible'],
      [500, 'FAMILY_INTEGRAL_DETAIL_ERROR', 'Error interno del servidor'], ['network', undefined, 'No se pudo conectar con el servicio'],
    ]) {
      mode = { status, code }
      await navigate()
      await wait(`document.body.innerText.includes(${JSON.stringify(title)})`)
      assert.equal(await evaluate("document.body.innerText.includes('INTERNAL SQL SECRET')"), false)
      assert.equal(await evaluate("document.querySelector('[role=tablist]')"), null)
    }
    mode = { status: 200 }
    await evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent==='Reintentar').click()")
    await ready()
    await command('Network.enable')
    await command('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
    await wait("document.body.innerText.includes('No se guarda una copia local con datos personales')")
    assert.equal(await evaluate("document.querySelector('[role=tablist]')"), null)
    await command('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
    await ready()
    const beforeReload = requests.filter((request) => request.path.endsWith('/expediente')).length
    await command('Page.reload')
    for (let attempt = 0; attempt < 200 && requests.filter((request) => request.path.endsWith('/expediente')).length <= beforeReload; attempt++) await new Promise((resolve) => setTimeout(resolve, 50))
    assert.ok(requests.filter((request) => request.path.endsWith('/expediente')).length > beforeReload)
    await ready()
    assert.deepEqual(failures, [])
    console.log('Mock record evidence: loading, two members/programs, inactive member, empty history, safe dates, long text, all HTTP states, distinct 404 codes, tab links/roving arrows/Home/End/Tab, 3 panels x 5 widths x 2 themes, no personal storage, no POST/basic fallback, offline/reconnect/reload.')
  } finally {
    socket?.close()
    browser.kill()
  }
})
