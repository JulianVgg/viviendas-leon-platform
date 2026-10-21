import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import ts from 'typescript'

const src = resolve(dirname(fileURLToPath(import.meta.url)), '../src/modules/notifications/reminders.rules.ts')
const js = ts.transpileModule(readFileSync(src, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
const { parseReglas, parsePreferencias, fechaProgramada, reglasTrasCambioFecha } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

test('un día antes es a las 08:00 de Guatemala sin depender del servidor', () => {
  assert.equal(fechaProgramada('2026-11-15', { tipo: 'DIA_ANTES' }).toISOString(), '2026-11-14T14:00:00.000Z')
})
test('dos días antes y mismo día, incluso al cambiar de mes', () => {
  assert.equal(fechaProgramada('2026-11-01', { tipo: 'DOS_DIAS_ANTES' }).toISOString(), '2026-10-30T14:00:00.000Z')
  assert.equal(fechaProgramada('2026-11-01', { tipo: 'MISMO_DIA' }).toISOString(), '2026-11-01T14:00:00.000Z')
})
test('fecha personalizada se interpreta en horario local UTC-6', () => {
  assert.equal(fechaProgramada('2026-11-15', { tipo: 'PERSONALIZADO', fechaHora: '2026-11-14T18:30' }).toISOString(), '2026-11-15T00:30:00.000Z')
})
test('configuración omitida toma las preferencias; lista vacía desactiva', () => {
  assert.equal(parseReglas(undefined, '2026-11-15'), null)
  assert.deepEqual(parseReglas([], '2026-11-15'), [])
})
test('reglas múltiples válidas y sin repetición', () => {
  const good = [{ tipo: 'DOS_DIAS_ANTES' }, { tipo: 'DIA_ANTES' }, { tipo: 'PERSONALIZADO', fechaHora: '2026-11-14T09:00' }]
  assert.deepEqual(parseReglas(good, '2026-11-15'), good)
  assert.equal(parseReglas([{ tipo: 'DIA_ANTES' }, { tipo: 'DIA_ANTES' }], '2026-11-15'), undefined)
})
test('rechaza recordatorios posteriores, horas relativas sin evento horario y fechas imposibles', () => {
  for (const bad of [
    [{ tipo: 'PERSONALIZADO', fechaHora: '2026-11-16T08:00' }],
    [{ tipo: 'DOS_HORAS_ANTES' }],
    [{ tipo: 'PERSONALIZADO', fechaHora: '2026-02-30T12:00' }],
    [{ tipo: 'PERSONALIZADO', fechaHora: '2026-11-14T25:00' }],
  ]) assert.equal(parseReglas(bad, '2026-11-15'), undefined)
})
test('solo preferencias válidas por día, sin duplicados, y permite desactivar', () => {
  assert.deepEqual(parsePreferencias(['DIA_ANTES', 'MISMO_DIA']), ['DIA_ANTES', 'MISMO_DIA'])
  assert.deepEqual(parsePreferencias([]), [])
  assert.equal(parsePreferencias(['DIA_ANTES','DIA_ANTES']), null)
  assert.equal(parsePreferencias(['PERSONALIZADO']), null)
  assert.equal(parsePreferencias('DIA_ANTES'), null)
})

test('reprogramar elimina solo fechas personalizadas incompatibles', () => {
  const config = [{ tipo: 'DIA_ANTES' }, { tipo: 'PERSONALIZADO', fechaHora: '2026-11-14T09:00' }]
  assert.deepEqual(reglasTrasCambioFecha(config, '2026-11-10'), [{ tipo: 'DIA_ANTES' }])
  assert.deepEqual(reglasTrasCambioFecha(config, '2026-11-15'), config)
  assert.equal(reglasTrasCambioFecha(null, '2026-11-10'), null)
})
