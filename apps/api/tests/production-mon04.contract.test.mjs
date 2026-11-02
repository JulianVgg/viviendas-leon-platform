import test from 'node:test'
import assert from 'node:assert/strict'
import { resumirAgricultura } from '../dist/modules/dashboard/agriculture-production.rules.js'
import { filtroProduccion } from '../dist/modules/dashboard/mon05-filters.js'

// MON-04 lee registro_produccion y detalle_produccion; AGR-05 escribe exactamente esas relaciones.
test('AGR-05/MON-04: suma cosechas efectivas por unidad, no estimaciones de visitas', () => {
  const ciclos = [{ id: 7, estado: 'ACTIVO', cantidadPlantas: 12,
    cultivo: { id: 3, nombre: 'Tomate' }, huerto: { familia: { id: 10, comunidad: { nombre: 'Paxub' } } } }]
  const fechaFinPeriodo = new Date('2026-10-29T00:00:00.000Z')
  const producciones = [
    { id: 1, fechaFinPeriodo, cicloCultivo: { cultivo: { id: 3, nombre: 'Tomate' } },
      detalles: [{ cantidadTotal: '12.750', unidadMedida: { codigo: 'KG', abreviatura: 'kg' } }] },
    { id: 2, fechaFinPeriodo, cicloCultivo: { cultivo: { id: 3, nombre: 'Tomate' } },
      detalles: [{ cantidadTotal: '5', unidadMedida: { codigo: 'UNIDAD', abreviatura: 'unid.' } }] },
    { id: 3, fechaFinPeriodo, cicloCultivo: { cultivo: { id: 3, nombre: 'Tomate' } },
      detalles: [{ cantidadTotal: '2', unidadMedida: { codigo: 'MANOJO', abreviatura: 'manojos' } }] },
  ]
  const resumen = resumirAgricultura(ciclos, producciones, ['2026-10'])
  assert.equal(resumen.indicadores.registrosProduccion, 3)
  assert.equal(resumen.indicadores.produccionKg, 12.75)
  assert.equal(resumen.indicadores.produccionUnidades, 5)
  assert.equal(resumen.indicadores.unidadesNoComparables, 1)
  assert.equal(resumen.produccionMensual[0].registros, 3)
  assert.equal(resumen.produccionMensual[0].kg, 12.75)
})

// MON-05 filtra indicadores por comunidad, no por nombre y sin mezclar responsables de visitas.
test('AGR-05/MON-05: la cosecha se filtra mediante la comunidad de la familia del ciclo', () => {
  assert.deepEqual(filtroProduccion({ comunidadId: 12, responsableId: 7 }), {
    cicloCultivo: { huerto: { familia: { comunidadId: 12 } } },
  })
  assert.deepEqual(filtroProduccion({}), {})
  assert.deepEqual(filtroProduccion({ responsableId: 7 }), {})
})
