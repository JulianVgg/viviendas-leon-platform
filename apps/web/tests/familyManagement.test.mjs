import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildFamilyUpdate, buildMemberCreate, buildMemberUpdate, familyDraftFrom, memberDraftFrom, validateFamilyDraft, validateMemberDraft } from '../src/features/families/services/familyManagement.ts'

const community = { id: 4, nombre: 'QA COMMUNITY', municipio: { id: 2, nombre: 'QA MUNICIPALITY' } }
const family = {
  id: 12,
  version: '123',
  nombreReferencia: 'QA FAMILY',
  comunidad: community,
  estado: 'RETIRADA',
  fechaIngreso: '2026-10-01T00:00:00.000Z',
  observaciones: null,
  integrantes: [],
  programas: [{ id: 1, programaId: 8, programa: { id: 8, nombre: 'QA PROGRAM' }, fechaIngreso: null, fechaSalida: null, estado: 'ACTIVO', observaciones: null }],
}

test('FAM-03 preloads real values without inventing state and builds changed fields only', () => {
  const initial = familyDraftFrom(family)
  assert.deepEqual(initial, { nombreReferencia: 'QA FAMILY', comunidadId: '4', fechaIngreso: '2026-10-01', observaciones: '' })
  assert.equal('estado' in initial, false)
  const draft = { ...initial, nombreReferencia: ' QA FAMILY UPDATED ', observaciones: ' ' }
  assert.deepEqual(buildFamilyUpdate(family, draft, initial), { version: '123', nombreReferencia: 'QA FAMILY UPDATED', observaciones: null })
  assert.equal(family.programas.length, 1)
})

test('FAM-03 validates community, real dates and field limits', () => {
  assert.deepEqual(validateFamilyDraft(familyDraftFrom(family), [community]), {})
  const errors = validateFamilyDraft({ nombreReferencia: '', comunidadId: '99', fechaIngreso: '2026-02-30', observaciones: 'x'.repeat(2001) }, [community])
  assert.deepEqual(Object.keys(errors).sort(), ['comunidadId', 'fechaIngreso', 'nombreReferencia', 'observaciones'])
})

test('FAM-05 new members require date, sex and relationship and normalize optional values', () => {
  const empty = memberDraftFrom()
  const errors = validateMemberDraft(empty, true)
  for (const field of ['nombreCompleto', 'fechaNacimiento', 'sexo', 'parentesco']) assert.ok(errors[field])
  const draft = { ...empty, nombreCompleto: ' QA PERSON ', fechaNacimiento: '2000-02-29', sexo: 'Femenino', parentesco: 'Madre' }
  assert.deepEqual(validateMemberDraft(draft, true), {})
  assert.deepEqual(buildMemberCreate(draft), { nombreCompleto: 'QA PERSON', fechaNacimiento: '2000-02-29', sexo: 'Femenino', parentesco: 'Madre', telefono: null, observaciones: null })
})

test('FAM-05 editing preserves historical nulls and sends only modified fields', () => {
  const member = { id: 7, version: '44', nombreCompleto: 'QA HISTORICAL', fechaNacimiento: null, sexo: null, parentesco: null, telefono: null, observaciones: null, activo: false }
  const initial = memberDraftFrom(member)
  assert.deepEqual(validateMemberDraft(initial, false), {})
  assert.deepEqual(buildMemberUpdate(member, initial, initial), { version: '44' })
  assert.deepEqual(buildMemberUpdate(member, { ...initial, telefono: '5550000' }, initial), { version: '44', telefono: '5550000' })
})
