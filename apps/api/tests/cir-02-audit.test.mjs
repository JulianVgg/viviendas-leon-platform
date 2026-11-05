import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeText, parseCsv, reconcileFamilies, toMarkdown } from '../scripts/cir-02-audit-lib.mjs'

function padron(name = 'María López') {
  return [ `${name},Paxub'`, ...Array.from({ length: 18 }, (_, i) => `Participante ${i + 2},Los Planes`) ].join('\n')
}

test('normaliza tildes, apostrofes y espacios sin cambiar el original', () => {
  assert.equal(normalizeText(" PAXUB’ "), 'paxub')
  assert.equal(normalizeText('María  López'), 'maria lopez')
})

test('CSV exige 19 participantes, columnas y valores', () => {
  const data = parseCsv(`\uFEFFnombre,comunidad\r\n${padron()}\r\n`)
  assert.equal(data.length, 19)
  assert.equal(data[0].nombre, 'María López')
  assert.throws(() => parseCsv('nombre,comunidad\nPersona,Comunidad'), /19 participantes/)
  assert.throws(() => parseCsv('nombre,comunidad\n,Comunidad'), /obligatorios/)
  assert.throws(() => parseCsv('nombre,comunidad\n"Persona,Comunidad'), /comillas sin cerrar/)
})

test('las coincidencias parciales nunca se aceptan automáticamente', () => {
  const db = [{ id: 1, nombreReferencia: 'Familia López', comunidad: "Paxub'", estado: 'ACTIVA',
    integrantes: [{ nombreCompleto: 'María Antonia López' }], huertos: [{ estado: 'ACTIVO' }] }]
  const report = reconcileFamilies(parseCsv(`nombre,comunidad\n${padron()}`), db, ["Paxub'", 'Los Planes'])
  assert.equal(report.findings[0].status, 'REVISAR_NOMBRE')
  assert.equal(report.summary.exactas, 0)
  assert.equal(report.summary.huertosActivos, 1)
})

test('detecta coincidencia exacta, comunidades distintas y posible duplicado', () => {
  const data = parseCsv(`nombre,comunidad\n${padron()}`)
  const one = { id: 2, nombreReferencia: 'Familia ejemplo', comunidad: 'Paxub', estado: 'ACTIVA',
    integrantes: [{ nombreCompleto: 'Maria Lopez' }], huertos: [] }
  const exact = reconcileFamilies(data, [one], ['Paxub', 'Los Planes'])
  assert.equal(exact.findings[0].status, 'COINCIDENCIA_EXACTA')
  assert.equal(exact.summary.exactas, 1)
  const different = reconcileFamilies(data, [{ ...one, comunidad: 'Payajut' }], ['Paxub'])
  assert.equal(different.findings[0].status, 'REVISAR_COMUNIDAD')
  const duplicate = reconcileFamilies(data, [one, { ...one, id: 3 }], ['Paxub'])
  assert.equal(duplicate.findings[0].status, 'DUPLICADO_POTENCIAL')
  assert.equal(duplicate.summary.exactas, 0)
  assert.match(toMarkdown(duplicate), /DUPLICADO_POTENCIAL/)
})

test('identifica familias incompletas y huertos, sin editar los datos de entrada', () => {
  const data = parseCsv(`nombre,comunidad\n${padron()}`)
  const family = { id: 4, nombreReferencia: 'María López', comunidad: "Paxub'", estado: 'ACTIVA',
    integrantes: [], huertos: [{ estado: 'INACTIVO' }] }
  const report = reconcileFamilies(data, [family], ["Paxub'", 'Los Planes'])
  assert.equal(report.incomplete.length, 1)
  assert.equal(report.summary.huertosActivos, 0)
  assert.equal(report.summary.familiasSinHuertoActivo.length, 1)
  assert.equal(family.integrantes.length, 0)
})
