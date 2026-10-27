import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../src/modules/visits/visit-schedule.rules.ts', import.meta.url), 'utf8')
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { CICLO_VISITA_DIAS, sumarDiasCiviles, proximaFechaSugerida, estaEnMismoCiclo, proximaFechaDisponible, fechaProgramacionValida } = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(output)}`)

test('La periodicidad de referencia es exactamente de 8 días', () => {
  assert.equal(CICLO_VISITA_DIAS, 8)
  assert.equal(proximaFechaSugerida('2026-10-15'), '2026-10-23')
})
test('Ciclos de ocho días cruzan mes y año sin alterar la fecha civil', () => {
  assert.equal(sumarDiasCiviles('2026-10-27', 8), '2026-11-04')
  assert.equal(sumarDiasCiviles('2026-12-29', 8), '2027-01-06')
  assert.equal(sumarDiasCiviles('2028-02-26', 8), '2028-03-05')
})
test('Familias sin visitas previas no reciben una fecha inventada', () => {
  assert.equal(proximaFechaSugerida(null), null)
})

test('Una cita dentro de los mismos 8 días se reconoce como ciclo ya cubierto', () => {
  assert.equal(estaEnMismoCiclo('2026-10-15', '2026-10-22'), true)
  assert.equal(estaEnMismoCiclo('2026-10-15', '2026-10-23'), false)
  assert.equal(estaEnMismoCiclo('2026-10-15', '2026-10-07'), false)
})
test('La próxima visita sugerida considera citas asignadas previamente', () => {
  assert.equal(proximaFechaDisponible('2026-10-15', ['2026-10-23', '2026-10-31']), '2026-11-08')
  assert.equal(proximaFechaDisponible(null, []), null)
})


test('No permite agendar en días anteriores al actual en Guatemala', () => {
  const now = new Date('2026-10-27T17:30:00Z') // 11:30 en Guatemala.
  assert.equal(fechaProgramacionValida('2026-10-26', now), false)
  assert.equal(fechaProgramacionValida('2026-10-27', now), true)
  assert.equal(fechaProgramacionValida('2026-10-28', now), true)
  assert.equal(fechaProgramacionValida('2026-02-30', now), false)
})

test('El límite de programación cambia a medianoche de Guatemala', () => {
  assert.equal(fechaProgramacionValida('2026-10-27', new Date('2026-10-28T05:59:59Z')), true)
  assert.equal(fechaProgramacionValida('2026-10-27', new Date('2026-10-28T06:00:00Z')), false)
  assert.equal(fechaProgramacionValida('2026-10-28', new Date('2026-10-28T06:00:00Z')), true)
})
