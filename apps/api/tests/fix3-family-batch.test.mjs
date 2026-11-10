import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateBatchFamilyUpdate } from '../dist/modules/families/family-batch.validation.js'
import { detectFamilyPhoto, MAX_FAMILY_PHOTO_BYTES } from '../dist/modules/families/family-photo.validation.js'

const version = '123'
const newProgram = (programaId = 1) => ({ action: 'create', input: {
  programaId, estado: 'ACTIVO', fechaIngreso: '2026-06-05', fechaSalida: null, observaciones: null,
} })

test('FIX3 permite cambiar solo el estado pendiente a activo', () => {
  const result = validateBatchFamilyUpdate({ version, changes: { estado: 'ACTIVA' }, programs: [] })
  assert.deepEqual(result.details, [])
  assert.equal(result.data?.changes.estado, 'ACTIVA')
})

test('FIX3 permite asociar un programa sin tocar la información general', () => {
  const result = validateBatchFamilyUpdate({ version, changes: {}, programs: [newProgram()] })
  assert.deepEqual(result.details, [])
  assert.equal(result.data?.programs[0].action, 'create')
  assert.ok(result.data?.programs[0].input.fechaIngreso instanceof Date)
})

test('FIX3 permite editar un programa existente con versionamiento', () => {
  const result = validateBatchFamilyUpdate({ version, changes: {}, programs: [{ action: 'update', id: 9, input: { version: '42', estado: 'FINALIZADO', fechaSalida: '2026-06-12' } }] })
  assert.deepEqual(result.details, [])
  assert.equal(result.data?.programs[0].id, 9)
})

test('FIX3 rechaza duplicados, fechas incongruentes y estado desconocido', () => {
  const result = validateBatchFamilyUpdate({ version, changes: { estado: 'DESCONOCIDO' }, programs: [newProgram(), newProgram()] })
  assert.ok(result.details.some(({ field }) => field === 'estado'))
  assert.ok(result.details.some(({ message }) => message.includes('repetido')))
  const bad = validateBatchFamilyUpdate({ version, changes: {}, programs: [
    { action: 'create', input: { ...newProgram().input, fechaIngreso: '2026-08-01', fechaSalida: '2026-07-01' } },
  ] })
  assert.ok(bad.details.some(({ field }) => field.endsWith('fechaSalida')))
})

test('FIX3 rechaza solicitudes sin cambios y campos ajenos', () => {
  assert.ok(validateBatchFamilyUpdate({ version, changes: {}, programs: [] }).details.length > 0)
  assert.ok(validateBatchFamilyUpdate({ version, changes: { id: 5 }, programs: [] }).details.some(({ field }) => field === 'id'))
})

test('FIX3 detecta fotos JPEG, PNG, WebP y rechaza contenido activo', () => {
  assert.equal(detectFamilyPhoto(Buffer.from([0xff, 0xd8, 0xff, 0x00]))?.mime, 'image/jpeg')
  assert.equal(detectFamilyPhoto(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))?.mime, 'image/png')
  assert.equal(detectFamilyPhoto(Buffer.from('RIFFabcdWEBP', 'ascii'))?.mime, 'image/webp')
  assert.equal(detectFamilyPhoto(Buffer.from('<svg>script</svg>')), null)
  assert.equal(MAX_FAMILY_PHOTO_BYTES, 4 * 1024 * 1024)
})
