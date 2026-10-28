import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const source = readFileSync(fileURLToPath(new URL('../src/features/calendar/services/calendarFilters.ts', import.meta.url)), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { filtrarActividades, estadoActividad } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const rows = [
  {key:'visita-1', kind:'technical', visit: {id:1, fecha:'2026-10-20', estado:'PROGRAMADA', familia:'Familia A', comunidad:'Paxub', responsable:'Yohan'}},
  {key:'visita-2', kind:'technical', visit: {id:2, fecha:'2026-10-28', estado:'REALIZADA', familia:'Familia B', comunidad:'Los Planes', responsable:'Luis'}},
  {key:'evento-3', kind:'institutional', event: {id:3, fechaInicio:'2026-10-28', fechaFin:'2026-10-28', responsable:{id:7,nombre:'Yohan'}}},
  {key:'capacitacion-4', kind:'training', training: {id:4, fecha:'2026-10-27', estado:'FINALIZADA', comunidad:'Paxub', facilitador:'Brenda'}},
]
const todos = {tipo:'todos', estado:'todos', responsable:'', comunidad:''}
test('visita vencida no se confunde con una realizada', () => {
  assert.equal(estadoActividad(rows[0], '2026-10-27'),'vencida')
  assert.equal(estadoActividad(rows[1], '2026-10-27'),'realizada')
})
test('filtra por técnico y por tipo', () => {
  assert.deepEqual(filtrarActividades(rows,{...todos, tipo:'visita', responsable:'Yohan'},'2026-10-27').map(x=>x.key),['visita-1'])
})
test('filtra comunidad y vencimiento sin mostrar otras actividades', () => {
  assert.deepEqual(filtrarActividades(rows,{...todos, estado:'vencida', comunidad:'Paxub'},'2026-10-27').map(x=>x.key),['visita-1'])
})
test('eventos institucionales no se duplican al filtrar', () => {
  assert.deepEqual(filtrarActividades(rows,{...todos, tipo:'evento'},'2026-10-27').map(x=>x.key),['evento-3'])
})
