import test from 'node:test'
import assert from 'node:assert/strict'
import {
  claveInforme, huellaInforme, estadoEfectivo, puedeRevisar, puedeValidar,
  puedeAprobarContenido, validarComentario,
} from '../src/modules/reports/semester.review.rules.ts'

const base = {
  filtros: { anio: 2026, semestre: 2 },
  periodo: { anio: 2026, semestre: 2, desde: '2026-07-01', hasta: '2026-12-31', hastaExclusivo: '2027-01-01' },
  resumen: { cosechas: 1, datosIncompletos: 0, posiblesDuplicados: 0, excluidasCrucePeriodo: 0 },
  porCultivo: [{ cultivo: 'Tomate', kg: '10' }], detalleCosechas: [{ id: 1, cantidad: '10' }],
  detalleVentas: [], advertencias: [],
}

test('CIR-15: los informes distinguen periodo y alcance', () => {
  assert.equal(claveInforme({ anio: 2026, semestre: 2 }), '2026:S2:C0:F0')
  assert.notEqual(claveInforme({ anio: 2026, semestre: 2 }), claveInforme({ anio: 2026, semestre: 2, familiaId: 4 }))
})
test('CIR-15: la huella cambia cuando cambia una cantidad del detalle, incluso con el mismo resumen', () => {
  const original = huellaInforme(base)
  assert.equal(original.length, 64)
  assert.notEqual(original, huellaInforme({ ...base, detalleCosechas: [{ id: 1, cantidad: '9' }] }))
})
test('CIR-15: una aprobación anterior no autoriza datos nuevos', () => {
  assert.equal(estadoEfectivo('VALIDADO', 'abc', 'abc'), 'VALIDADO')
  assert.equal(estadoEfectivo('VALIDADO', 'abc', 'xyz'), 'CAMBIOS_POSTERIORES')
  assert.equal(estadoEfectivo('EN_REVISION', 'abc', 'xyz'), 'PRELIMINAR')
  assert.equal(estadoEfectivo(null, null, 'abc'), 'PRELIMINAR')
})
test('CIR-15: permisos separados de consulta, revisión y aprobación', () => {
  const coordinacion = { roles: ['Coordinadora del programa agroforestal'], permisos: ['REPORTE_SEMESTRAL_REVISAR'] }
  assert.equal(puedeRevisar(coordinacion), true)
  assert.equal(puedeValidar(coordinacion), false)
  assert.equal(puedeValidar({ roles: ['Dirección general'], permisos: [] }), true)
  assert.equal(puedeRevisar({ roles: ['Técnico agropecuario'], permisos: [] }), false)
})
test('CIR-15: anomalías impiden aprobar cifras inconsistentes', () => {
  assert.equal(puedeAprobarContenido(base), true)
  assert.equal(puedeAprobarContenido({ ...base, resumen: { ...base.resumen, posiblesDuplicados: 2 } }), false)
  assert.equal(puedeAprobarContenido({ ...base, advertencias: [{ codigo: 'A', referencia: 1, mensaje: 'Revisar' }] }), false)
})
test('CIR-15: comentario limitado y validado', () => {
  assert.equal(validarComentario('  Todo correcto  '), 'Todo correcto')
  assert.equal(validarComentario(''), null)
  assert.throws(() => validarComentario('x'.repeat(1001)))
})
