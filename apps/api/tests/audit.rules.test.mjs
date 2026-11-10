import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyAuditOperation,
  normalizedAuditPath,
  pathRecordId,
  responseRecordId,
  safeAuditMetadata,
} from '../dist/modules/audit/audit.rules.js'

test('registra autenticación, cambios y rechazo de acciones de solo lectura', () => {
  assert.deepEqual(classifyAuditOperation('POST', '/api/v1/auth/login'), { entidad: 'autenticacion', accion: 'LOGIN' })
  assert.deepEqual(classifyAuditOperation('POST', '/api/v1/auth/logout'), { entidad: 'autenticacion', accion: 'LOGOUT' })
  assert.deepEqual(classifyAuditOperation('PATCH', '/api/v1/auth/password'), { entidad: 'autenticacion', accion: 'PASSWORD_CHANGE' })
  assert.deepEqual(classifyAuditOperation('PATCH', '/api/v1/familias/4'), { entidad: 'familia', accion: 'UPDATE' })
  assert.deepEqual(classifyAuditOperation('DELETE', '/api/v1/visitas/2'), { entidad: 'visita', accion: 'DELETE' })
  assert.equal(classifyAuditOperation('GET', '/api/v1/familias'), null)
  assert.equal(classifyAuditOperation('POST', '/api/v1/auditoria/bitacora'), null)
  assert.equal(classifyAuditOperation('POST', '/api/v1/offline/replay'), null)
})

test('extrae IDs sin registrar contenidos de formularios ni respuestas', () => {
  assert.equal(pathRecordId('/api/v1/familias/15/integrantes/3'), '3')
  assert.equal(responseRecordId({ data: { id: 23, nombre: 'Confidencial' } }), '23')
  assert.equal(responseRecordId({ usuario: { id: 9, passwordHash: 'oculto' } }), '9')
  assert.equal(responseRecordId({ data: [{ id: 1 }] }), null)
  assert.equal(normalizedAuditPath('/api/v1/familias/15/integrantes/3'), '/api/v1/familias/:id/integrantes/:id')
  const metadata = safeAuditMetadata('PATCH', '/api/v1/familias/15', 403)
  assert.equal(JSON.parse(metadata).resultado, 'RECHAZADO')
  assert.ok(!metadata.includes('15'))
})
