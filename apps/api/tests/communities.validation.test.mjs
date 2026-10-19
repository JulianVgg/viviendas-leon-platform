import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateCommunityInput, validateCommunityState, parseCommunityId } from '../dist/modules/catalogs/communities.validation.js'

test('FAM-06: normaliza nombres y acepta un municipio válido', () => {
  const result = validateCommunityInput({ nombre: '  Los   Planes  ', municipioId: 1 })
  assert.deepEqual(result.data, { nombre: 'Los Planes', municipioId: 1 })
})

test('FAM-06: rechaza entradas inválidas y campos inesperados', () => {
  for (const input of [null, [], { nombre: '', municipioId: 1 }, { nombre: 'Paxub', municipioId: 0 }, { nombre: 'Paxub', municipioId: 1, activo: true }]) {
    assert.equal(validateCommunityInput(input).data, undefined)
  }
})

test('FAM-06: valida identificadores y estados', () => {
  assert.equal(parseCommunityId('21'), 21)
  assert.equal(parseCommunityId('0'), null)
  assert.equal(parseCommunityId('1abc'), null)
  assert.deepEqual(validateCommunityState({ activo: false }).data, { activo: false })
  assert.equal(validateCommunityState({ activo: 'false' }).data, undefined)
})
