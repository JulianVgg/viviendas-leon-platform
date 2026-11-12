import test from 'node:test'
import assert from 'node:assert/strict'
import { ESTADO_ELIMINADO, esEliminado, validarEliminacion } from '../dist/modules/users/users.soft-delete.js'
import { classifyAuditOperation } from '../dist/modules/audit/audit.rules.js'

test('CIR-24: distingue eliminación lógica de desactivación', () => {
  assert.equal(ESTADO_ELIMINADO, 'ELIMINADO')
  assert.equal(esEliminado('ELIMINADO'), true)
  assert.equal(esEliminado('INACTIVO'), false)
  assert.equal(esEliminado('ACTIVO'), false)
})
test('CIR-24: impide autoeliminación y IDs inválidos', () => {
  assert.equal(validarEliminacion(5, 5), 'CUENTA_PROPIA')
  assert.equal(validarEliminacion(0, 5), 'ID_INVALIDO')
  assert.equal(validarEliminacion(NaN, 5), 'ID_INVALIDO')
  assert.equal(validarEliminacion(1.5, 5), 'ID_INVALIDO')
  assert.equal(validarEliminacion(9, 5), null)
})
test('CIR-24: DELETE queda identificado por la bitácora de usuarios', () => {
  assert.deepEqual(classifyAuditOperation('DELETE', '/api/v1/usuarios/9'), { entidad: 'usuario', accion: 'DELETE' })
})
