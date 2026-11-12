import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canRetryVisitSync, retryDelayMs } from '../src/features/visits/services/visitRetryPolicy.ts'

test('errores temporales de red y API admiten reintento automático', () => {
  for (const reason of ['Failed to fetch', 'NetworkError', 'Error temporal de API (HTTP 503).',
    'No se pudo sincronizar la foto img.jpg (HTTP 502).', 'No se pudo sincronizar (HTTP 429)',
    'Inicia sesión para sincronizar.']) {
    assert.equal(canRetryVisitSync(reason), true, reason)
  }
})

test('requisitos de negocio y permisos NO se reintentan automáticamente', () => {
  for (const reason of ['La cosecha no puede ser anterior a la siembra',
    'No se pudo sincronizar la visita (HTTP 400).', 'Permiso denegado (HTTP 403).', 'Registro inválido']) {
    assert.equal(canRetryVisitSync(reason), false, reason)
  }
})

test('espera creciente y acotada para errores de transporte', () => {
  assert.equal(retryDelayMs(1), 10_000)
  assert.equal(retryDelayMs(2), 20_000)
  assert.equal(retryDelayMs(3), 40_000)
  assert.equal(retryDelayMs(20), 15 * 60_000)
})
