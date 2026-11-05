import test from 'node:test'
import assert from 'node:assert/strict'
import { marcarEstimacionesVisita, ORIGEN_ESTIMACION_VISITA } from '../dist/modules/visits/visit-production-source.js'
import { resumirAgricultura, contarVisitasConProduccion } from '../dist/modules/dashboard/agriculture-production.rules.js'

const visitas = [
  { datos: { familyId: 19, crops: [ { name: 'Tomate', cicloCultivoId: 7, production: true, kg: 9, units: 20, priceQ: 4 } ] } },
  { datos: { crops: [ { name: 'Zanahoria', production: true, kg: 5 } ] } },
]

test('CIR-06: captura antigua se identifica como estimación sin mutar el original', () => {
  const old = visitas[0].datos
  const classified = marcarEstimacionesVisita(old)
  assert.equal(classified.crops[0].origenProduccion, ORIGEN_ESTIMACION_VISITA)
  assert.equal(old.crops[0].origenProduccion, undefined)
  assert.equal(classified.crops[0].cicloCultivoId, 7)
  assert.equal(classified.crops[0].kg, 9)
})

test('CIR-06: etiquetas de cliente no pueden transformar una estimación en cosecha real', () => {
  const tampered = { crops: [ { production: true, origenProduccion: 'COSECHA_REAL' }, { production: false } ] }
  const classified = marcarEstimacionesVisita(tampered)
  assert.equal(classified.crops[0].origenProduccion, 'ESTIMACION_VISITA')
  assert.equal(classified.crops[1].origenProduccion, undefined)
  assert.equal(marcarEstimacionesVisita(null), null)
  assert.deepEqual(marcarEstimacionesVisita({ crops: null }), { crops: null })
})

test('CIR-06: dos estimaciones no se suman a ninguna cosecha del Dashboard', () => {
  const cycle = { id: 7, estado: 'ACTIVO', cantidadPlantas: 20, cultivo: { id: 1, nombre: 'Tomate' }, huerto: { familia: { id: 19, comunidad: { nombre: 'Paxub' } } } }
  const summary = resumirAgricultura([cycle], [], ['2026-11'])
  assert.equal(contarVisitasConProduccion(visitas), 2)
  assert.equal(summary.indicadores.registrosProduccion, 0)
  assert.equal(summary.indicadores.produccionKg, 0)
  assert.equal(summary.indicadores.produccionUnidades, 0)
})

test('CIR-06: cosecha formal suma una vez aunque exista estimación de la misma familia y ciclo', () => {
  const cycle = { id: 7, estado: 'ACTIVO', cantidadPlantas: 20, cultivo: { id: 1, nombre: 'Tomate' }, huerto: { familia: { id: 19, comunidad: { nombre: 'Paxub' } } } }
  const harvest = { id: 10, fechaFinPeriodo: new Date('2026-11-01T00:00:00.000Z'), cicloCultivo: { cultivo: { id: 1, nombre: 'Tomate' } }, detalles: [ { cantidadTotal: '3.500', unidadMedida: { codigo: 'KG', abreviatura: 'kg' } } ] }
  const summary = resumirAgricultura([cycle], [harvest], ['2026-11'])
  assert.equal(summary.indicadores.produccionKg, 3.5)
  assert.equal(summary.indicadores.registrosProduccion, 1)
  assert.equal(contarVisitasConProduccion(visitas), 2)
})
