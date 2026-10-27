import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

// Estas reglas no usan Prisma y pueden probarse sin una base de datos.
const source = readFileSync(new URL('../src/modules/visits/visit-schedule.rules.ts', import.meta.url), 'utf8')
const transpiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { fechaHoyGuatemala, capturaValida, requiereReprogramar } = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(transpiled)}`)

test('Guatemala utiliza su propia fecha al cruzar la medianoche UTC', () => {
  assert.equal(fechaHoyGuatemala(new Date('2026-10-25T04:00:00Z')), '2026-10-24')
  assert.equal(fechaHoyGuatemala(new Date('2026-10-25T06:00:00Z')), '2026-10-25')
})
test('Una visita del 15 no puede completarse con fecha 24 sin reprogramación', () => {
  assert.equal(requiereReprogramar('2026-10-15', '2026-10-24'), true)
  assert.equal(requiereReprogramar('2026-10-24', '2026-10-24'), false)
})
test('Una visita offline capturada el día correcto conserva su fecha aunque sincronice más tarde', () => {
  assert.equal(capturaValida('2026-10-24', '2026-10-24T16:00:00.000Z', new Date('2026-10-27T12:00:00Z')), true)
  assert.equal(capturaValida('2026-10-15', '2026-10-24T16:00:00.000Z', new Date('2026-10-27T12:00:00Z')), false)
})
test('Se rechazan capturas futuras o con timestamps inválidos', () => {
  assert.equal(capturaValida('2026-10-24', 'no-es-fecha', new Date('2026-10-24T18:00:00Z')), false)
  assert.equal(capturaValida('2026-10-24', '2026-10-24T23:00:00Z', new Date('2026-10-24T18:00:00Z')), false)
})
