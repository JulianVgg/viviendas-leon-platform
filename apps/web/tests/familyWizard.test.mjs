import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildIntegralPayload, createMemberDraft, createProgramDraft, integralErrorMessage, mapServerErrors, memberField, memberRelationshipOptions, memberSexOptions, programField, stepForField, validDate, validateWizardStep } from '../src/features/families/services/familyWizard.ts'

const communities = [{ id: 1, nombre: 'QA COMMUNITY', municipio: { id: 1, nombre: 'QA MUNICIPALITY' } }]
const options = [1, 2].map((id) => ({ id, nombre: `QA PROGRAM ${id}`, estado: 'ACTIVO', descripcion: null }))
const valid = () => ({ nombreReferencia: ' QA FAMILY ', comunidadId: '1', fechaIngreso: '2026-10-14', observaciones: '', integrantes: [{ ...createMemberDraft('member-a'), nombreCompleto: ' QA PERSON ', fechaNacimiento: '2000-01-15', sexo: 'Femenino', parentesco: 'Madre' }], programas: [{ ...createProgramDraft('program-a'), programaId: '1' }] })

test('all three input steps accept valid synthetic data without mutation', () => {
  const draft = valid()
  const before = structuredClone(draft)
  for (const step of [0, 1, 2]) assert.deepEqual(validateWizardStep(step, draft, communities, options), {})
  assert.deepEqual(draft, before)
})

for (const [name, value, field] of [
  ['blank reference', { nombreReferencia: '  ' }, 'nombreReferencia'],
  ['long reference', { nombreReferencia: 'a'.repeat(151) }, 'nombreReferencia'],
  ['missing community', { comunidadId: '' }, 'comunidadId'],
  ['unknown community', { comunidadId: '99' }, 'comunidadId'],
  ['long observations', { observaciones: 'a'.repeat(2001) }, 'observaciones'],
  ['invalid family date', { fechaIngreso: '2026-02-30' }, 'fechaIngreso'],
  ['missing family date', { fechaIngreso: '' }, 'fechaIngreso'],
]) test(name, () => assert.ok(validateWizardStep(0, { ...valid(), ...value }, communities, options)[field]))

test('at least one member and every member name are mandatory', () => {
  const draft = valid()
  draft.integrantes = []
  assert.ok(validateWizardStep(1, draft, communities, options).integrantes)
  draft.integrantes = [createMemberDraft('a'), createMemberDraft('b')]
  const errors = validateWizardStep(1, draft, communities, options)
  assert.ok(errors[memberField('a', 'nombreCompleto')])
  assert.ok(errors[memberField('b', 'nombreCompleto')])
})

test('member dates use stable error keys', () => {
  const draft = valid()
  draft.integrantes[0].fechaNacimiento = '2001-02-29'
  assert.ok(validateWizardStep(1, draft, communities, options)[memberField('member-a', 'fechaNacimiento')])
})

test('member sex and relationship accept only the requested required values', () => {
  assert.deepEqual(memberSexOptions, ['Masculino', 'Femenino'])
  assert.deepEqual(memberRelationshipOptions, ['Padre', 'Madre', 'Hijo', 'Hija', 'Abuela', 'Abuelo', 'Cuñado', 'Cuñada'])
  const draft = valid()
  for (const sexo of memberSexOptions) {
    for (const parentesco of memberRelationshipOptions) {
      Object.assign(draft.integrantes[0], { sexo, parentesco })
      assert.deepEqual(validateWizardStep(1, draft, communities, options), {})
      const member = buildIntegralPayload(draft).integrantes[0]
      assert.equal(member.sexo, sexo || null)
      assert.equal(member.parentesco, parentesco || null)
    }
  }
  Object.assign(draft.integrantes[0], { sexo: 'Unavailable', parentesco: 'Unavailable' })
  const errors = validateWizardStep(1, draft, communities, options)
  assert.ok(errors[memberField('member-a', 'sexo')])
  assert.ok(errors[memberField('member-a', 'parentesco')])
})

test('birth date, sex and relationship are required for every member with stable field errors', () => {
  const draft = valid()
  draft.integrantes.push({ ...createMemberDraft('member-b'), nombreCompleto: 'QA PERSON TWO' })
  let errors = validateWizardStep(1, draft, communities, options)
  assert.ok(errors[memberField('member-b', 'fechaNacimiento')])
  assert.ok(errors[memberField('member-b', 'sexo')])
  assert.ok(errors[memberField('member-b', 'parentesco')])
  Object.assign(draft.integrantes[1], { fechaNacimiento: '2001-02-28', sexo: 'Masculino', parentesco: 'Hijo' })
  Object.assign(draft.integrantes[0], { fechaNacimiento: '', sexo: '', parentesco: '' })
  errors = validateWizardStep(1, draft, communities, options)
  assert.ok(errors[memberField('member-a', 'fechaNacimiento')])
  assert.ok(errors[memberField('member-a', 'sexo')])
  assert.ok(errors[memberField('member-a', 'parentesco')])
  assert.equal(errors[memberField('member-b', 'fechaNacimiento')], undefined)
  assert.equal(errors[memberField('member-b', 'sexo')], undefined)
  assert.equal(errors[memberField('member-b', 'parentesco')], undefined)
})

test('only family observations and member phone/observations may be omitted', () => {
  const draft = valid()
  assert.deepEqual(validateWizardStep(0, draft, communities, options), {})
  assert.deepEqual(validateWizardStep(1, draft, communities, options), {})
  const payload = buildIntegralPayload(draft)
  assert.equal(payload.observaciones, null)
  assert.equal(payload.integrantes[0].telefono, null)
  assert.equal(payload.integrantes[0].observaciones, null)
  assert.equal(payload.programas[0].fechaIngreso, null)
  assert.equal(payload.programas[0].fechaSalida, null)
})

test('requires actual program options and at least one selection', () => {
  assert.ok(validateWizardStep(2, valid(), communities, []).programas)
  assert.ok(validateWizardStep(2, { ...valid(), programas: [] }, communities, options).programas)
  const draft = valid()
  draft.programas[0].programaId = '999'
  assert.ok(validateWizardStep(2, draft, communities, options)[programField('program-a', 'programaId')])
})

test('multiple members/programs work, duplicated IDs do not', () => {
  const draft = valid()
  draft.integrantes.push({ ...createMemberDraft('member-b'), nombreCompleto: 'QA PERSON TWO', fechaNacimiento: '2001-02-28', sexo: 'Masculino', parentesco: 'Hijo' })
  draft.programas.push({ ...createProgramDraft('program-b'), programaId: '2' })
  assert.deepEqual(validateWizardStep(1, draft, communities, options), {})
  assert.deepEqual(validateWizardStep(2, draft, communities, options), {})
  draft.programas[1].programaId = '1'
  assert.ok(validateWizardStep(2, draft, communities, options)[programField('program-b', 'programaId')])
})

test('participation exit cannot precede entry', () => {
  const draft = valid()
  Object.assign(draft.programas[0], { fechaIngreso: '2026-10-14', fechaSalida: '2026-10-13' })
  assert.ok(validateWizardStep(2, draft, communities, options)[programField('program-a', 'fechaSalida')])
  draft.programas[0].fechaSalida = '2026-10-14'
  assert.deepEqual(validateWizardStep(2, draft, communities, options), {})
})

test('date validation rejects rollovers, year zero and timestamps', () => {
  for (const date of ['0000-01-01', '2026-02-29', '2026-13-01', '2026-10-14T00:00:00Z', 'not-a-date']) assert.equal(validDate(date), false)
  for (const date of ['', '2000-02-29', '2026-10-14']) assert.equal(validDate(date), true)
})

test('payload matches backend validator and never leaks local/server-owned fields', async () => {
  const draft = valid()
  draft.fechaIngreso = '2026-10-14'
  draft.integrantes[0].fechaNacimiento = '2000-01-15'
  const payload = buildIntegralPayload(draft)
  assert.equal(payload.nombreReferencia, 'QA FAMILY')
  assert.equal(payload.fechaIngreso, '2026-10-14')
  assert.equal(payload.integrantes[0].fechaNacimiento, '2000-01-15')
  assert.equal(payload.programas[0].estado, null)
  assert.equal(payload.programas[0].fechaIngreso, null)
  assert.equal(payload.observaciones, null)
  const { validateIntegralFamilyInput } = await import('../../api/dist/modules/families/families-integral.validation.js')
  assert.deepEqual(validateIntegralFamilyInput(payload).details, [])
  for (const row of [...payload.integrantes, ...payload.programas]) {
    for (const key of ['localId', 'id', 'familiaId', 'activo']) assert.equal(key in row, false)
  }
  assert.equal('estado' in payload, false)
})

test('indexed backend errors map to the submitted stable rows, including row-level errors', () => {
  const submitted = valid()
  submitted.integrantes.unshift({ ...createMemberDraft('removed-earlier'), nombreCompleto: 'QA PERSON TWO' })
  const errors = mapServerErrors([
    { field: 'integrantes[1].nombreCompleto', message: 'Required' },
    { field: 'programas[0].programaId', message: 'Unavailable' },
    { field: 'integrantes[1]', message: 'Invalid row' },
    { field: 'comunidadId', message: 'Inactive' },
  ], submitted)
  assert.equal(errors[memberField('member-a', 'nombreCompleto')], 'Required')
  assert.equal(errors[programField('program-a', 'programaId')], 'Unavailable')
  assert.equal(errors['integrantes.member-a'], 'Invalid row')
  assert.equal(errors.comunidadId, 'Inactive')
  for (const [field, expected] of [['nombreReferencia', 0], ['integrantes.member-a.nombreCompleto', 1], ['programas.program-a.programaId', 2]]) assert.equal(stepForField(field), expected)
})

test('safe error messages distinguish session, permissions, unavailable service, server and ambiguous POST', () => {
  assert.match(integralErrorMessage(400, true), /conservan/)
  assert.match(integralErrorMessage(401), /sesión/)
  assert.match(integralErrorMessage(403), /permiso/)
  assert.match(integralErrorMessage(404), /no está disponible/)
  assert.match(integralErrorMessage(500, true), /servidor/)
  assert.match(integralErrorMessage(undefined, true), /podría haberse guardado/)
  assert.match(integralErrorMessage(undefined), /catálogo/)
})

// Optional browser checks use the existing Brave executable and native CDP.
// All /api requests are intercepted: this is UI evidence, NOT real integration.
test('browser wizard: controlled rows, validation, errors, single POST, themes and widths (mock HTTP)', { skip: process.env.RUN_FAMILY_WIZARD_BROWSER !== 'true', timeout: 120000 }, async () => {
  const { spawn } = await import('node:child_process')
  const { mkdtemp } = await import('node:fs/promises')
  const { join } = await import('node:path')
  const profile = await mkdtemp(join(process.env.LOCALAPPDATA, 'Temp', 'opencode', 'family-wizard-brave-'))
  const executable = process.env.BRAVE_PATH || join(process.env.LOCALAPPDATA, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')
  const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] })
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
      browser.on('exit', (code) => reject(new Error(`Brave exited: ${code}`)))
    })
    socket = new WebSocket(endpoint)
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
    let sequence = 0
    const pending = new Map()
    const listeners = new Map()
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
      } else listeners.get(message.method)?.(message.params, message.sessionId)
    }
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    const command = (method, params = {}) => send(method, params, sessionId)
    const evaluate = async (expression) => {
      const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
      return result.result.value
    }
    const wait = async (expression) => {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (await evaluate(expression)) return
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      throw new Error(`Timed out: ${expression}`)
    }
    const click = (text) => evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)}); if (!button || button.disabled) throw new Error('Button unavailable: ' + ${JSON.stringify(text)}); button.click(); })()`)
    const fill = (id, value) => evaluate(`(() => { const el = document.getElementById(${JSON.stringify(id)}); if (!el) throw new Error('Missing control'); const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); })()`)
    let postMode = '400'
    let catalogMode = 'ok'
    let sessionValid = true
    const posts = []
    const failures = []
    listeners.set('Fetch.requestPaused', (event) => {
      void (async () => {
        const path = new URL(event.request.url).pathname
        let status = 200
        let payload
        if (path === '/api/v1/auth/me') {
          status = sessionValid ? 200 : 401
          payload = sessionValid ? { usuario: { id: 1, nombre: 'QA USER', correo: 'qa@example.invalid', roles: [], permisos: [] } } : { error: { message: 'Session expired' } }
        }
        else if (path === '/api/v1/comunidades') payload = { data: communities }
        else if (path.endsWith('/opciones/programas')) {
          if (catalogMode === 'error') { status = 500; payload = { error: { message: 'Internal data must not be displayed' } } }
          else payload = { data: catalogMode === 'empty' ? [] : options }
        } else if (path.endsWith('/registro-integral')) {
          posts.push(JSON.parse(event.request.postData))
          if (postMode === 'network') { await command('Fetch.failRequest', { requestId: event.requestId, errorReason: 'ConnectionFailed' }); return }
          status = Number(postMode)
          payload = status === 400 ? { error: { details: [{ field: 'integrantes[1].nombreCompleto', message: 'QA indexed member error' }] } } : status === 201 ? { data: { id: 987654 } } : { error: { message: 'Internal data must not be displayed' } }
          await new Promise((resolve) => setTimeout(resolve, 150))
        } else if (path === '/api/v1/familias/987654') payload = { data: { id: 987654, nombreReferencia: 'QA FAMILY', comunidad: communities[0], estado: 'ACTIVA', fechaIngreso: null, observaciones: null } }
        else if (path === '/api/v1/familias/987654/expediente') payload = { data: {
          id: 987654, nombreReferencia: 'QA FAMILY', comunidad: communities[0], estado: 'ACTIVA', fechaIngreso: null, observaciones: null,
          integrantes: posts.at(-1).integrantes.map((member, index) => ({ ...member, id: index + 1, activo: true })),
          programas: posts.at(-1).programas.map((program, index) => ({ ...program, id: index + 10, programa: { id: program.programaId, nombre: `QA PROGRAM ${program.programaId}` } })),
        } }
        else { status = 404; payload = { error: { message: 'Mock route unavailable' } } }
        await command('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(payload)).toString('base64') })
      })().catch((error) => {
        // StrictMode/unmount can abort a paused catalog request before fulfillment.
        if (error.message !== 'Invalid InterceptionId.') failures.push(error.message)
      })
    })
    await command('Fetch.enable', { patterns: [{ urlPattern: '*/api/*' }] })
    await command('Page.enable')
    const auditLayout = async () => {
      for (const width of [320, 375, 768, 1024, 1440]) {
        await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false })
        // Let the existing responsive AppLayout/sidebar CSS transition settle.
        await evaluate('new Promise(resolve => setTimeout(resolve, 350))')
        for (const dark of [false, true]) {
          await evaluate(`document.documentElement.classList.toggle('dark', ${dark})`)
          const overflow = await evaluate(`({ width: innerWidth, scroll: document.documentElement.scrollWidth, elements: [...document.querySelectorAll('main *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 5).map(el => ({ tag: el.tagName, id: el.id, right: el.getBoundingClientRect().right })) })`)
          assert.equal(overflow.scroll <= overflow.width, true, `Horizontal overflow: ${width}, dark=${dark}: ${JSON.stringify(overflow)}`)
        }
      }
    }
    const base = process.env.FAMILY_WIZARD_URL || 'http://127.0.0.1:5173'
    await command('Page.navigate', { url: `${base}/familias/nueva` })
    await wait(`document.body.innerText.includes('Paso 1 de 4')`)
    await auditLayout()
    await click('Continuar')
    await wait(`document.activeElement?.id === 'wizard-nombreReferencia'`)
    await fill('wizard-nombreReferencia', 'QA FAMILY')
    await fill('wizard-comunidadId', '1')
    await fill('wizard-observaciones', 'QA SYNTHETIC NOTES')
    await click('Continuar')
    await wait(`document.activeElement?.id === 'wizard-fechaIngreso'`)
    assert.equal(await evaluate(`document.getElementById('wizard-fechaIngreso').required`), true)
    await fill('wizard-fechaIngreso', '2026-10-14')
    await click('Continuar')
    await wait(`document.body.innerText.includes('Paso 2 de 4')`)
    await click('Continuar')
    await wait(`document.activeElement?.id === 'wizard-integrantes.member-1.nombreCompleto'`)
    await fill('wizard-integrantes.member-1.nombreCompleto', 'QA PERSON ONE')
    await click('Continuar')
    await wait(`document.activeElement?.id === 'wizard-integrantes.member-1.fechaNacimiento'`)
    assert.equal(await evaluate(`document.getElementById('wizard-integrantes.member-1.fechaNacimiento').required`), true)
    await fill('wizard-integrantes.member-1.fechaNacimiento', '2000-01-15')
    await click('Continuar')
    await wait(`document.activeElement?.id === 'wizard-integrantes.member-1.sexo'`)
    assert.equal(await evaluate(`document.getElementById('wizard-integrantes.member-1.sexo').required`), true)
    assert.deepEqual(await evaluate(`Array.from(document.getElementById('wizard-integrantes.member-1.sexo').options, option => option.value)`), ['', 'Masculino', 'Femenino'])
    assert.deepEqual(await evaluate(`Array.from(document.getElementById('wizard-integrantes.member-1.parentesco').options, option => option.value)`), ['', 'Padre', 'Madre', 'Hijo', 'Hija', 'Abuela', 'Abuelo', 'Cuñado', 'Cuñada'])
    await fill('wizard-integrantes.member-1.sexo', 'Femenino')
    await click('Continuar')
    await wait(`document.activeElement?.id === 'wizard-integrantes.member-1.parentesco'`)
    assert.equal(await evaluate(`document.getElementById('wizard-integrantes.member-1.parentesco').required`), true)
    assert.equal(await evaluate(`document.getElementById('wizard-integrantes.member-1.telefono').required`), false)
    await fill('wizard-integrantes.member-1.parentesco', 'Madre')
    await click('Agregar integrante')
    await wait(`document.activeElement?.id === 'wizard-integrantes.member-3.nombreCompleto'`)
    await fill('wizard-integrantes.member-3.nombreCompleto', 'QA PERSON TWO')
    await fill('wizard-integrantes.member-3.fechaNacimiento', '2001-02-28')
    await fill('wizard-integrantes.member-3.sexo', 'Masculino')
    await fill('wizard-integrantes.member-3.parentesco', 'Hijo')
    await auditLayout()
    await click('Agregar integrante')
    await wait(`document.activeElement?.id === 'wizard-integrantes.member-4.nombreCompleto'`)
    await evaluate(`document.querySelector('[aria-label="Quitar integrante 3"]').click()`)
    await wait(`document.activeElement?.id === 'wizard-integrantes.member-3.nombreCompleto'`)
    await click('Anterior')
    await wait(`document.getElementById('wizard-nombreReferencia')?.value === 'QA FAMILY'`)
    await click('Continuar')
    await wait(`document.getElementById('wizard-integrantes.member-3.nombreCompleto')?.value === 'QA PERSON TWO'`)
    assert.equal(await evaluate(`document.getElementById('wizard-integrantes.member-1.sexo').value`), 'Femenino')
    assert.equal(await evaluate(`document.getElementById('wizard-integrantes.member-1.fechaNacimiento').value`), '2000-01-15')
    assert.equal(await evaluate(`document.getElementById('wizard-integrantes.member-1.parentesco').value`), 'Madre')
    await click('Continuar')
    await wait(`document.body.innerText.includes('Paso 3 de 4')`)
    await fill('wizard-programas.program-2.programaId', '1')
    await click('Agregar programa')
    await wait(`document.activeElement?.id === 'wizard-programas.program-5.programaId'`)
    assert.equal(await evaluate(`document.querySelector('[id="wizard-programas.program-5.programaId"] option[value="1"]').disabled`), true)
    await fill('wizard-programas.program-5.programaId', '2')
    await auditLayout()
    await fill('wizard-programas.program-5.fechaIngreso', '2026-10-14')
    await fill('wizard-programas.program-5.fechaSalida', '2026-10-13')
    await click('Continuar')
    await wait(`document.activeElement?.id === 'wizard-programas.program-5.fechaSalida'`)
    await fill('wizard-programas.program-5.fechaSalida', '2026-10-14')
    await click('Continuar')
    await wait(`document.body.innerText.includes('Paso 4 de 4')`)
    assert.equal(posts.length, 0)
    await auditLayout()
    // Keyboard focus must move to a visible native control.
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    assert.equal(await evaluate(`['BUTTON','A','INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)`), true)
    await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent === 'Confirmar y registrar'); b.click(); b.click(); })()`)
    await wait(`document.activeElement?.id === 'wizard-integrantes.member-3.nombreCompleto' && document.body.innerText.includes('QA indexed member error')`)
    assert.equal(posts.length, 1)
    assert.equal(posts[0].integrantes.length, 2)
    assert.equal(posts[0].integrantes[0].sexo, 'Femenino')
    assert.equal(posts[0].integrantes[0].fechaNacimiento, '2000-01-15')
    assert.equal(posts[0].integrantes[0].parentesco, 'Madre')
    assert.equal(posts[0].programas.length, 2)
    assert.equal('localId' in posts[0].integrantes[0], false)
    await click('Continuar')
    await click('Continuar')
    await wait(`document.body.innerText.includes('Paso 4 de 4')`)
    for (const status of ['401', '403', '404', '500']) {
      postMode = status
      await click('Confirmar y registrar')
      await wait(`document.activeElement?.id === 'wizard-submission-error' && !document.querySelector('form').getAttribute('aria-busy').includes('true')`)
      assert.equal(await evaluate(`document.body.innerText.includes('Internal data must not be displayed')`), false)
    }
    sessionValid = false
    const beforeExpiredSession = posts.length
    await click('Confirmar y registrar')
    await wait(`document.body.innerText.includes('ha expirado') && document.activeElement?.id === 'wizard-submission-error'`)
    assert.equal(posts.length, beforeExpiredSession, 'No POST is allowed after failed session validation')
    assert.equal(await evaluate(`document.body.innerText.includes('QA PERSON TWO')`), true)
    sessionValid = true
    postMode = '201'
    await click('Confirmar y registrar')
    await wait(`location.pathname === '/familias/987654'`)
    await wait(`document.querySelector('[role=tablist]') !== null && document.querySelector('main').innerText.includes('QA FAMILY')`)
    assert.equal(posts.length, 6)
    // Separate mount to check catalog retry and ambiguous POST blocking.
    catalogMode = 'empty'
    await command('Page.navigate', { url: `${base}/familias/nueva` })
    await wait(`document.getElementById('wizard-nombreReferencia') !== null`)
    await fill('wizard-nombreReferencia', 'QA SECOND FAMILY')
    await fill('wizard-comunidadId', '1')
    await fill('wizard-fechaIngreso', '2026-10-14')
    await click('Continuar')
    await fill('wizard-integrantes.member-1.nombreCompleto', 'QA PERSON')
    await fill('wizard-integrantes.member-1.fechaNacimiento', '2000-01-15')
    await fill('wizard-integrantes.member-1.sexo', 'Femenino')
    await fill('wizard-integrantes.member-1.parentesco', 'Madre')
    await click('Continuar')
    await wait(`document.body.innerText.includes('No hay programas disponibles')`)
    assert.equal(await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Continuar').disabled`), true)
    catalogMode = 'error'
    await click('Reintentar')
    await wait(`document.body.innerText.includes('No se pudieron consultar los programas')`)
    catalogMode = 'ok'
    await click('Reintentar')
    await wait(`document.getElementById('wizard-programas.program-2.programaId') !== null`)
    await fill('wizard-programas.program-2.programaId', '1')
    await click('Continuar')
    postMode = 'network'
    await click('Confirmar y registrar')
    await wait(`document.body.innerText.includes('podría haberse guardado')`)
    assert.equal(await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Confirmar y registrar').disabled`), true)
    assert.deepEqual(failures, [])
    console.log('Browser evidence: synthetic HTTP only; four steps, stable rows, back navigation, indexed 400, 401/403/404/500, expired session prevents POST, single POST, 201 redirect, empty/error catalog retries, network ambiguity, all 4 steps x 5 widths x 2 themes without horizontal overflow, Tab focus.')
  } finally {
    socket?.close()
    browser.kill()
  }
})
