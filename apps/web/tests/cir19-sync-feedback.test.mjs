import test from 'node:test'
import assert from 'node:assert/strict'
import { mensajeErrorSincronizacion } from '../src/features/visits/services/visitSyncFeedback.ts'

test('CIR-19: sin detalle, conserva aviso claro sobre la cola', () => {
  assert.match(mensajeErrorSincronizacion(undefined), /guardada en este dispositivo/)
})

test('CIR-19: guía al usuario si expiró su sesión', () => {
  assert.match(mensajeErrorSincronizacion('Inicia sesión para sincronizar.'), /Inicia sesión nuevamente/)
  assert.match(mensajeErrorSincronizacion('No se pudo sincronizar (HTTP 401).'), /sesión venció/)
})

test('CIR-19: indica cuándo debe revisarse un conflicto', () => {
  assert.match(mensajeErrorSincronizacion('HTTP 409'), /conflicto/)
  assert.match(mensajeErrorSincronizacion('HTTP 422'), /revisa el registro/i)
})

test('CIR-19: mensajes de red son legibles y nunca afirman sincronización', () => {
  const message = mensajeErrorSincronizacion('Failed to fetch')
  assert.match(message, /permanece guardada/)
  assert.doesNotMatch(message, /sincronizada correctamente/)
})

test('CIR-19: limita errores arbitrarios para no desbordar la vista', () => {
  assert.ok(mensajeErrorSincronizacion('x'.repeat(500)).length <= 180)
})
