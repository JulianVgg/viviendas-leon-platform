import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pureSource = resolve(root, 'src/modules/notifications/reminders.worker.rules.ts')
const pureJs = ts.transpileModule(readFileSync(pureSource, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
const { resultadoFallo, resumenRecordatorio, permisoDeOrigen, INTERVALO_REVISION_MS } =
  await import(`data:text/javascript;base64,${Buffer.from(pureJs).toString('base64')}`)

const { procesarUno } = await import('../dist/modules/notifications/reminders.worker.js')
function fake(overrides = {}) {
  const row = { id: 11, usuarioId: 9, tipoOrigen: 'CALENDARIO', origenId: 7, estado: 'PENDIENTE', intentos: 0, ...overrides.row }
  const state = { row, notices: [], updates: 0 }
  const user = overrides.user === undefined ? { estado: 'ACTIVO', roles: [{ rol: { nombre: 'Dirección general', permisos: [] } }] } : overrides.user
  const event = overrides.event === undefined ? { titulo: 'Capacitación', fechaInicio: new Date('2026-11-04T00:00:00Z'), participantes: [{ usuarioId: 9 }] } : overrides.event
  const visit = overrides.visit === undefined ? { estado: 'PROGRAMADA', usuarioResponsableId: 9, fecha: new Date('2026-11-04T00:00:00Z'), familia: { nombreReferencia: 'Familia X' } } : overrides.visit
  const tx = {
    $queryRaw: async () => state.row?.estado === 'PENDIENTE' ? [{ id: state.row.id }] : [],
    recordatorio: {
      findUniqueOrThrow: async () => ({ ...state.row }),
      update: async ({ data }) => { const prev = state.row.intentos; Object.assign(state.row, data); if (data.intentos?.increment) state.row.intentos = prev + data.intentos.increment; state.updates++ },
    },
    usuario: { findUnique: async () => user },
    eventoInstitucional: { findUnique: async () => event },
    visita: { findUnique: async () => visit },
    notificacion: { createMany: async ({ data }) => {
      if (overrides.failCreate) throw new Error('Error de entrega simulado')
      const nuevos = data.filter(n => !state.notices.some(old => old.claveEvento === n.claveEvento))
      state.notices.push(...nuevos)
      return { count: nuevos.length }
    } },
  }
  const db = {
    $transaction: async fn => fn(tx),
    recordatorio: {
      findUnique: async () => state.row && { estado: state.row.estado, intentos: state.row.intentos },
      updateMany: async ({ where, data }) => {
        if (state.row.estado !== where.estado || state.row.intentos !== where.intentos) return { count: 0 }
        state.row.intentos += data.intentos.increment
        Object.assign(state.row, { ...data, intentos: state.row.intentos })
        return { count: 1 }
      },
    },
  }
  return { state, db }
}

test('backoff de 1, 2, 4, 8 minutos y límite de cinco intentos', () => {
  const now = new Date('2026-10-21T14:00:00Z')
  for (let i = 0; i < 4; i++) {
    const r = resultadoFallo(i, now)
    assert.equal(r.estado, 'PENDIENTE')
    assert.equal(r.proximoIntento.toISOString(), new Date(now.getTime() + 2 ** i * 60_000).toISOString())
  }
  assert.deepEqual(resultadoFallo(4, now), { estado: 'ERROR', proximoIntento: null })
})
test('los mensajes se relacionan con la ruta interna y fecha local de actividad', () => {
  const f = new Date('2026-11-04T00:00:00Z')
  assert.match(resumenRecordatorio('CALENDARIO', 'Capacitación', f).mensaje, /2026-11-04/)
  assert.equal(resumenRecordatorio('CALENDARIO', 'Capacitación', f).referencia, '/calendario')
  assert.equal(resumenRecordatorio('VISITA', 'Familia X', f).referencia, '/visitas/agenda')
  assert.equal(permisoDeOrigen('CALENDARIO'), 'PANTALLA_CALENDARIO')
  assert.equal(permisoDeOrigen('VISITA'), 'PANTALLA_VISITAS_AGENDA')
  assert.throws(() => permisoDeOrigen('INVENTADO'))
  assert.equal(INTERVALO_REVISION_MS, 60_000)
})
test('evento vigente: inserta aviso y marca ENVIADO en la misma operación', async () => {
  const { state, db } = fake()
  assert.equal(await procesarUno(db), 'ENVIADO')
  assert.equal(state.row.estado, 'ENVIADO')
  assert.equal(state.row.intentos, 1)
  assert.equal(state.notices.length, 1)
  assert.equal(state.notices[0].claveEvento, 'REM:11')
  assert.equal(state.notices[0].usuarioId, 9)
  assert.equal(await procesarUno(db), 'VACIO')
  assert.equal(state.notices.length, 1)
})
test('usuario inactivo no recibe aviso', async () => {
  const { state, db } = fake({ user: { estado: 'INACTIVO', roles: [] } })
  assert.equal(await procesarUno(db), 'CANCELADO')
  assert.equal(state.row.estado, 'CANCELADO')
  assert.equal(state.notices.length, 0)
})
test('usuario sin permiso no recibe aviso', async () => {
  const { state, db } = fake({ user: { estado: 'ACTIVO', roles: [] } })
  assert.equal(await procesarUno(db), 'CANCELADO')
  assert.equal(state.notices.length, 0)
})
test('participante retirado no recibe aviso', async () => {
  const { state, db } = fake({ event: { titulo: 'Reunión', fechaInicio: new Date(), participantes: [] } })
  assert.equal(await procesarUno(db), 'CANCELADO')
  assert.equal(state.notices.length, 0)
})
test('visita vigente del responsable crea notificación técnica', async () => {
  const { state, db } = fake({ row: { tipoOrigen: 'VISITA' } })
  assert.equal(await procesarUno(db), 'ENVIADO')
  assert.equal(state.notices[0].referencia, '/visitas/agenda')
})
test('visita realizada o re-asignada no genera recordatorio', async () => {
  for (const visit of [
    { estado: 'REALIZADA', usuarioResponsableId: 9 },
    { estado: 'PROGRAMADA', usuarioResponsableId: 21 },
    null,
  ]) {
    const { state, db } = fake({ row: { tipoOrigen: 'VISITA' }, visit })
    assert.equal(await procesarUno(db), 'CANCELADO')
    assert.equal(state.notices.length, 0)
  }
})
test('error temporal queda registrado y puede reintentarse', async () => {
  const { state, db } = fake({ failCreate: true })
  await assert.rejects(() => procesarUno(db), /Error de entrega simulado/)
  assert.equal(state.row.estado, 'PENDIENTE')
  assert.equal(state.row.intentos, 1)
  assert.match(state.row.ultimoError, /simulado/)
  assert.ok(state.row.proximoIntento > new Date(Date.now() - 1000))
})
test('tras agotar intentos pasa a ERROR, sin enviar notificación', async () => {
  const { state, db } = fake({ failCreate: true, row: { intentos: 4 } })
  await assert.rejects(() => procesarUno(db), /simulado/)
  assert.equal(state.row.estado, 'ERROR')
  assert.equal(state.row.intentos, 5)
  assert.equal(state.row.proximoIntento, null)
  assert.equal(state.notices.length, 0)
})
test('claveEvento estable permite recuperar un envío previamente confirmado sin duplicar', async () => {
  const { state, db } = fake()
  state.notices.push({ claveEvento: 'REM:11', usuarioId: 9 })
  assert.equal(await procesarUno(db), 'ENVIADO')
  assert.equal(state.notices.length, 1)
})
