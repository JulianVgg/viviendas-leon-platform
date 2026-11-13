import { test } from 'node:test'
import assert from 'node:assert/strict'
import { saludoGuatemala } from '../src/features/dashboard/lib/guatemalaDateTime.ts'

test('saluda según Guatemala aunque el navegador esté en otra zona', () => {
  assert.equal(saludoGuatemala(new Date('2026-11-12T12:00:00Z')), 'Buenos días') // 06:00 en Guatemala
  assert.equal(saludoGuatemala(new Date('2026-11-12T18:00:00Z')), 'Buenas tardes') // 12:00
  assert.equal(saludoGuatemala(new Date('2026-11-13T00:00:00Z')), 'Buenas noches') // 18:00
  assert.equal(saludoGuatemala(new Date('2026-11-13T05:00:00Z')), 'Buenas noches') // 23:00
})
