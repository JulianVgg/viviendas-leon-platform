import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const source = readFileSync(fileURLToPath(new URL('../src/features/visits/services/personalCalendarFilters.ts', import.meta.url)), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { filtrarAgenda, filtrosIniciales } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const rows = [
  { key: 'v1', label: 'Familia López', kind: 'visit', visit: { status: 'PROGRAMADA', date: '2026-10-19', familyName: 'Familia López', community: 'Paxub' } },
  { key: 'v2', label: 'Familia Pérez', kind: 'visit', visit: { status: 'REALIZADA', date: '2026-10-25', familyName: 'Familia Pérez', community: 'Los Planes' } },
  { key: 'f1', label: 'Limpiar huerto', kind: 'followup', followup: { status: 'PENDIENTE', familyName: 'Familia López', community: 'Paxub', due: null } },
  { key: 'e1', label: 'Capacitación agrícola', kind: 'institutional', invitation: { titulo: 'Capacitación agrícola', categoria: 'CAPACITACION', lugar: 'Santa Lucía', fechaFin: '2026-10-28' } },
  { key: 'c1', label: 'Taller de huertos', kind: 'training', training: { tema: 'Taller de huertos', estado: 'PROGRAMADA', fecha:'2026-10-30', comunidad:{nombre:'Paxub'}, facilitadorNombre:'Yohan' } },
  { key: 'h1', label: 'Reprogramada Familia López', kind: 'visit-history', visit: { status: 'PROGRAMADA', date: '2026-10-28', familyName: 'Familia López', community: 'Paxub' } },
]
const filter = (changes) => filtrarAgenda(rows, { ...filtrosIniciales, ...changes }, '2026-10-27').map(r => r.key)
test('sin filtros conserva todas las actividades', () => assert.deepEqual(filter({}), rows.map(x => x.key)))
test('visitas vencidas no incluye visitas realizadas ni reprogramaciones', () => assert.deepEqual(filter({ tipo: 'visitas', estado: 'vencidas' }), ['v1']))
test('eventos aceptados quedan disponibles con su filtro', () => assert.deepEqual(filter({ tipo: 'eventos' }), ['e1']))
test('filtra compromisos sin incluir visitas de la misma familia', () => assert.deepEqual(filter({ tipo: 'compromisos', busqueda: 'lopez' }), ['f1']))
test('busca familias y comunidades sin importar tildes', () => assert.deepEqual(filter({ busqueda: 'pérez' }), ['v2']))
test('muestra las reprogramaciones por separado', () => assert.deepEqual(filter({ tipo: 'reprogramaciones' }), ['h1']))
test('eventos anteriores muestran estado finalizado', () => {
  const old = [{ key:'e0', label:'Reunión', kind:'institutional', invitation:{ titulo:'Reunión', categoria:'REUNION', lugar:'Xela', fechaFin:'2026-10-20' } }]
  assert.deepEqual(filtrarAgenda(old, {...filtrosIniciales, estado:'finalizadas'},'2026-10-27').map(x=>x.key), ['e0'])
})

test('capacitaciones se filtran por tema y estado', () => assert.deepEqual(filter({ tipo: 'capacitaciones', busqueda: 'huertos', estado: 'programadas' }), ['c1']))
