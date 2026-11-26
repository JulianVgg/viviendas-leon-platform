import test from 'node:test'
import assert from 'node:assert/strict'
import { nivelInstitucional } from '../dist/modules/calendar/invitation-hierarchy.js'

test('Dirección tiene prioridad sobre Coordinación y Técnico', () => {
  assert.equal(nivelInstitucional(['Dirección general']), 2)
  assert.equal(nivelInstitucional(['Coordinadora del programa agroforestal']), 1)
  assert.equal(nivelInstitucional(['Coordinación']), 1)
  assert.equal(nivelInstitucional(['Técnico agropecuario']), 0)
  assert.equal(nivelInstitucional(['Contador']), 0)
})

test('Los nombres con acentos y espacios se normalizan; no se eleva un rol desconocido', () => {
  assert.equal(nivelInstitucional(['  DIRECCION GENERAL  ']), 2)
  assert.equal(nivelInstitucional(['coordinacion']), 1)
  assert.equal(nivelInstitucional(['Administración']), 0)
})

test('Solo un rango inferior puede solicitar reprogramación al organizador', () => {
  const puedeSolicitar = (solicitante, organizador) =>
    nivelInstitucional(solicitante) < nivelInstitucional(organizador)
  assert.equal(puedeSolicitar(['Técnico agropecuario'], ['Dirección general']), true)
  assert.equal(puedeSolicitar(['Técnico agropecuario'], ['Coordinación']), true)
  assert.equal(puedeSolicitar(['Coordinación'], ['Dirección general']), true)
  assert.equal(puedeSolicitar(['Coordinación'], ['Coordinación']), false)
  assert.equal(puedeSolicitar(['Dirección general'], ['Coordinación']), false)
})
