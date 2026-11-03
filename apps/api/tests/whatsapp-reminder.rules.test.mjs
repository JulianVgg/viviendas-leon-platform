import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizarTelefonoWhatsapp } from '../dist/modules/visits/whatsapp-reminder.rules.js'

test('acepta teléfono guatemalteco de ocho dígitos', () => {
  assert.equal(normalizarTelefonoWhatsapp('5555-1234'), '50255551234')
  assert.equal(normalizarTelefonoWhatsapp('502 5555 1234'), '50255551234')
  assert.equal(normalizarTelefonoWhatsapp('+502 5555 1234'), '50255551234')
})

test('acepta un número internacional explícito', () => {
  assert.equal(normalizarTelefonoWhatsapp('+1 (415) 555-0100'), '14155550100')
})

test('rechaza números ambiguos o inválidos', () => {
  assert.equal(normalizarTelefonoWhatsapp(null), null)
  assert.equal(normalizarTelefonoWhatsapp(''), null)
  assert.equal(normalizarTelefonoWhatsapp('555'), null)
  assert.equal(normalizarTelefonoWhatsapp('000000000'), null)
  assert.equal(normalizarTelefonoWhatsapp('http://ejemplo.com'), null)
})
