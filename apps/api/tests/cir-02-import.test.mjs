import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCsv } from '../scripts/cir-02-audit-lib.mjs'
import { buildImportPlan, makeReview, validateReview, COMUNIDADES_OBJETIVO } from '../scripts/cir-02-import-lib.mjs'

function sample() {
  const ref = Array.from({ length: 19 }, (_, index) => ({
    nombre: `Caso${index + 1} Apellido${index + 1}`,
    comunidad: COMUNIDADES_OBJETIVO[index % 5],
  }))
  return parseCsv('nombre,comunidad\n' + ref.map((r) => `${r.nombre},${r.comunidad}`).join('\n'))
}

const blank = () => ({ municipalities: [], communities: [], families: [] })

function approved(plan) {
  const review = makeReview(plan)
  review.responsable = 'Responsable de prueba'
  review.fechaValidacion = '2026-11-04'
  review.aprobacionInstitucional = true
  for (const [index, row] of plan.filas.entries()) {
    review.decisiones[index].decision = row.accionPropuesta
    review.decisiones[index].estadoFamilia = row.accionPropuesta === 'CREAR' ? 'PENDIENTE_VALIDACION' : ''
  }
  return review
}

test('simulación de 19 personas y cinco comunidades sin modificar datos', () => {
  const state = blank(), reference = sample()
  const previous = JSON.stringify({ state, reference })
  const plan = buildImportPlan(reference, state, 'origen-falso')
  assert.deepEqual(plan.resumen, { participantes: 19, crear: 19, existentes: 0, revisar: 0,
    comunidadesNuevas: 5, municipioNuevo: true })
  assert.match(plan.codigoRevision, /^[0-9A-F]{16}$/)
  assert.equal(JSON.stringify({ state, reference }), previous)
})

test('municipio y comunidad equivalentes por tildes/apóstrofos se reutilizan', () => {
  const state = { municipalities: [{ id: 2, nombre: 'Santa Lucia Utatlan', activo: true }],
    communities: [{ id: 8, municipioId: 2, nombre: "Paxub'", activo: true }], families: [] }
  const plan = buildImportPlan(sample(), state, 'hash')
  assert.equal(plan.resumen.municipioNuevo, false)
  assert.equal(plan.resumen.comunidadesNuevas, 4)
  assert.equal(plan.comunidades[0].existenteId, 8)
})

test('una persona existente se omite, sin reescribirla ni duplicarla', () => {
  const state = { ...blank(),
    municipalities: [{ id: 1, nombre: 'Santa Lucía Utatlán', activo: true }],
    families: [{ id: 9, nombreReferencia: 'Grupo sin nombre', municipioId: 1,
    comunidad: "Paxub'", estado: 'ACTIVA', integrantes: [{ nombreCompleto: 'Caso1 Apellido1' }], huertos: [] }] }
  const plan = buildImportPlan(sample(), state, 'hash')
  assert.equal(plan.resumen.existentes, 1)
  assert.equal(plan.resumen.crear, 18)
  assert.equal(plan.filas[0].accionPropuesta, 'EXISTE')
  assert.equal(validateReview(plan, approved(plan)), true)
})

test('coincidencias en otra comunidad bloquean la carga automática', () => {
  const state = { ...blank(), families: [{ id: 7, nombreReferencia: 'Caso1 Apellido1',
    comunidad: 'Payajut', estado: 'ACTIVA', integrantes: [], huertos: [] }] }
  const plan = buildImportPlan(sample(), state, 'hash')
  assert.equal(plan.resumen.revisar, 1)
  assert.equal(plan.filas[0].accionPropuesta, 'REVISAR')
  assert.throws(() => validateReview(plan, approved(plan)), /conciliación manual/)
})

test('se rechazan comunidades desconocidas, catálogo ambiguo e inactivo', () => {
  const ref = sample()
  ref[0].comunidad = 'Otra comunidad'
  assert.throws(() => buildImportPlan(ref, blank(), 'hash'), /cinco comunidades/)
  const badMunicipio = { ...blank(), municipalities: [
    { id: 1, nombre: 'Santa Lucia Utatlan', activo: true },
    { id: 2, nombre: 'Santa Lucía Utatlán', activo: true },
  ] }
  assert.throws(() => buildImportPlan(sample(), badMunicipio, 'hash'), /ambiguo/)
  const inactive = { ...blank(), municipalities: [{ id: 1, nombre: 'Santa Lucía Utatlán', activo: false }] }
  assert.throws(() => buildImportPlan(sample(), inactive, 'hash'), /inactivo/)
})

test('la revisión de cada registro y la aprobación institucional son obligatorias', () => {
  const plan = buildImportPlan(sample(), blank(), 'hash')
  const draft = makeReview(plan)
  assert.throws(() => validateReview(plan, draft), /aprobación institucional/)
  const review = approved(plan)
  review.decisiones[0].decision = ''
  assert.throws(() => validateReview(plan, review), /debe aprobarse/)
  review.decisiones[0].decision = 'CREAR'
  review.decisiones[0].estadoFamilia = 'ACTIVA'
  assert.equal(validateReview(plan, review), true)
  review.decisiones[0].nombre = 'Alguien diferente'
  assert.throws(() => validateReview(plan, review), /no coincide/)
})

test('protección frente a plan obsoleto, fechas inexistentes y estados ambiguos', () => {
  const plan = buildImportPlan(sample(), blank(), 'hash')
  const review = approved(plan)
  review.codigoRevision = 'antiguo'
  assert.throws(() => validateReview(plan, review), /otro plan/)
  review.codigoRevision = plan.codigoRevision
  review.fechaValidacion = '2026-02-30'
  assert.throws(() => validateReview(plan, review), /fecha válida/)
  review.fechaValidacion = '2026-11-04'
  review.decisiones[1].estadoFamilia = ''
  assert.throws(() => validateReview(plan, review), /estadoFamilia/)
})
