import test from 'node:test'
import assert from 'node:assert/strict'
import { mainStructures, matchesGardenGroup } from '../src/features/agriculture/services/gardenGroups.ts'

test('solo hay tres tarjetas principales', () => {
  assert.deepEqual(mainStructures.map(structure => structure.value), ['CAMPO_ABIERTO', 'MACROTUNEL', 'MIXTO'])
})

test('los tipos muestran únicamente sus propios huertos', () => {
  const gardens = ['CAMPO_ABIERTO', 'MACROTUNEL', 'MIXTO', 'OTRO', null]
    .map(entornoCultivo => ({ entornoCultivo }))
  for (const structure of mainStructures) {
    assert.equal(gardens.filter(garden => matchesGardenGroup(garden, structure.value)).length, 1)
  }
})

test('no se pierden huertos sin clasificar ni con estructura Otro', () => {
  assert.equal(matchesGardenGroup({ entornoCultivo: null }, 'SIN_CLASIFICAR'), true)
  assert.equal(matchesGardenGroup({ entornoCultivo: 'OTRO' }, 'SIN_CLASIFICAR'), true)
  assert.equal(matchesGardenGroup({ entornoCultivo: 'MIXTO' }, 'SIN_CLASIFICAR'), false)
})
