import assert from 'node:assert/strict'
import { test } from 'node:test'
import { onlyNameCharacters, onlyPhoneCharacters, selectedRole, validName, validOtherRole, validPhone, MAX_FAMILY_NAME, MAX_ROLE_NAME } from '../src/features/families/services/familyFieldRules.ts'
import { createMemberDraft, createProgramDraft, validateWizardStep, buildIntegralPayload, memberField } from '../src/features/families/services/familyWizard.ts'
import { validateTrainingForm } from '../src/features/training/services/trainingFormRules.ts'
import { validateMemberDraft } from '../src/features/families/services/familyManagement.ts'

const communities = [{ id: 8, nombre: 'Los Planes', municipio: { id: 4, nombre: 'Santa Lucía Utatlán' } }]
const programs = [{ id: 12, nombre: 'Huertos', estado: 'ACTIVO', descripcion: null }]
const family = () => ({ nombreReferencia: 'Familia García', comunidadId: '8', fechaIngreso: '2026-11-01', observaciones: '', integrantes: [{ ...createMemberDraft('one'), nombreCompleto: 'María García', fechaNacimiento: '1994-11-01', sexo: 'Femenino', parentesco: 'Madre' }], programas: [{ ...createProgramDraft('one'), programaId: '12' }] })
const training = () => ({ tema: 'Capacitación de huertos', fecha: '2026-11-12', descripcion: '', facilitador: 'Yohan Vásquez', horaInicio: '09:00', horaFin: '11:00', comunidadId: '8', observaciones: '' })

test('acepta letras con acentos, rechaza cifras, controla longitud y teléfono', () => {
  assert.equal(validName('Familia Xitamul', MAX_FAMILY_NAME), true)
  assert.equal(validName('José María', MAX_FAMILY_NAME), true)
  assert.equal(validName('María 888', MAX_FAMILY_NAME), false)
  assert.equal(validName('Z'.repeat(MAX_FAMILY_NAME + 1), MAX_FAMILY_NAME), false)
  assert.equal(onlyNameCharacters('Ana33 Pérez'), 'Ana Pérez')
  assert.equal(onlyPhoneCharacters('+502 1234#5678'), '+502 12345678')
  assert.equal(validPhone('+502 1234 5678'), true)
  assert.equal(validPhone('abc123'), false)
  assert.equal(validPhone('123'), false)
})

test('rol Otro se guarda con texto personalizado y sigue siendo editable', () => {
  const draft = family()
  draft.integrantes[0].parentesco = 'Otro'
  assert.ok(validateWizardStep(1, draft, communities, programs)[memberField('one', 'otroRol')])
  draft.integrantes[0].otroRol = 'Abuela'
  assert.deepEqual(validateWizardStep(1, draft, communities, programs), {})
  assert.equal(buildIntegralPayload(draft).integrantes[0].parentesco, 'Abuela')
  assert.equal(selectedRole('Abuela'), 'Otro')
  assert.equal(validOtherRole('Abuela'), true)
  assert.equal(validOtherRole('Abuela9'), false)
  assert.equal(validOtherRole('A'.repeat(MAX_ROLE_NAME + 1)), false)
})

test('validaciones del asistente impiden crear familia o integrante con datos inválidos', () => {
  const draft = family()
  for (const i of [0, 1, 2]) assert.deepEqual(validateWizardStep(i, draft, communities, programs), {})
  draft.nombreReferencia = 'Familia 123'
  assert.ok(validateWizardStep(0, draft, communities, programs).nombreReferencia)
  draft.nombreReferencia = 'Familia García'
  draft.integrantes[0].nombreCompleto = 'Juan 123'
  assert.ok(validateWizardStep(1, draft, communities, programs)[memberField('one', 'nombreCompleto')])
  draft.integrantes[0].nombreCompleto = 'Juan García'
  draft.integrantes[0].telefono = '1'.repeat(31)
  assert.ok(validateWizardStep(1, draft, communities, programs)[memberField('one', 'telefono')])
})

test('validación de integrante editado reconoce un rol anterior como personalizado', () => {
  assert.deepEqual(validateMemberDraft({ nombreCompleto: 'María García', fechaNacimiento: '1990-02-01', sexo: 'Femenino', parentesco: 'Tía', telefono: '', observaciones: '' }, false), {})
  assert.ok(validateMemberDraft({ nombreCompleto: 'María García', fechaNacimiento: '1990-02-01', sexo: 'Femenino', parentesco: 'Otro', telefono: '', observaciones: '' }, false).parentesco)
})

test('capacitación correcta y errores de fecha, horario, longitud, facilitador y comunidad', () => {
  assert.deepEqual(validateTrainingForm(training(), '2026-11-10', [8]), {})
  const t = training()
  t.tema = 'A'.repeat(161)
  t.fecha = '2026-11-09'
  t.facilitador = 'Yohan 123'
  t.horaFin = '08:00'
  t.comunidadId = '19'
  t.observaciones = 'x'.repeat(2001)
  const errors = validateTrainingForm(t, '2026-11-10', [8])
  for (const field of ['tema', 'fecha', 'facilitador', 'horaFin', 'comunidadId', 'observaciones']) assert.ok(errors[field], field)
})
