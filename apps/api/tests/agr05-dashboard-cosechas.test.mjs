import test from 'node:test'
import assert from 'node:assert/strict'
import { obtenerCosechasDashboard } from '../dist/modules/dashboard/agriculture-harvests.service.js'

const fecha = (dia) => new Date(`${dia}T00:00:00.000Z`)
const cosecha = (id, unidad, abreviatura, cantidad, dia='2026-10-30') => ({
  id, fechaInicioPeriodo: fecha(dia), fechaFinPeriodo: fecha(dia), cicloCultivoId: 14,
  cicloCultivo: {
    cultivo: { nombre: 'Tomate' },
    huerto: { nombre: 'Huerto principal', familia: { nombreReferencia: 'Familia López', comunidad: { nombre: 'Paxub' } } },
  },
  detalles: [{ cantidadTotal: { toString: () => String(cantidad) }, unidadMedida: { nombre: unidad, codigo: unidad, abreviatura } }],
})

test('AGR-05: el desglose pagina registros de cosecha reales, no capturas de visitas', async () => {
  const llamadas = []
  const db = { registroProduccion: {
    count: async (args) => { llamadas.push(['count', args]); return 25 },
    findMany: async (args) => { llamadas.push(['findMany', args]); return [cosecha(7,'KG','kg','12.750'), cosecha(6,'UNIDAD','unid.','5')] },
  } }
  const resultado = await obtenerCosechasDashboard(3, 2, 10, db, new Date('2026-10-31T18:00:00Z'), { comunidadId: 9, responsableId: 3 })
  assert.equal(resultado.total, 25)
  assert.equal(resultado.totalPaginas, 3)
  assert.equal(resultado.registros.length, 2)
  assert.deepEqual(resultado.registros[0].cantidades, [{ cantidad:'12.750', unidad:'kg', tipo:'kg' }])
  assert.equal(resultado.registros[0].fecha, '2026-10-30')
  assert.equal(resultado.registros[0].familia, 'Familia López')
  assert.equal(resultado.registros[0].comunidad, 'Paxub')
  assert.deepEqual(resultado.registros[1].cantidades, [{ cantidad:'5', unidad:'unid.', tipo:'unidades' }])
  assert.equal(llamadas[1][1].skip, 10)
  assert.equal(llamadas[1][1].take, 10)
  assert.deepEqual(llamadas[1][1].where.cicloCultivo, {huerto:{familia:{comunidadId:9}}})
  assert.deepEqual(llamadas[0][1].where, llamadas[1][1].where)
  assert.equal(llamadas[1][1].where.fechaFinPeriodo.gte.toISOString().slice(0,10), '2026-08-01')
  assert.equal(llamadas[1][1].where.fechaFinPeriodo.lte.toISOString().slice(0,10), '2026-10-31')
})

test('AGR-05: las unidades que no pueden sumarse como kg o piezas conservan su categoría', async () => {
  const db={registroProduccion:{count:async()=>1,findMany:async()=>[cosecha(1,'MANOJO','manojos','8')]}}
  const respuesta=await obtenerCosechasDashboard(6,1,10,db,new Date('2026-10-31T17:00:00Z'))
  assert.equal(respuesta.registros[0].cantidades[0].tipo,'otra')
  assert.equal(respuesta.registros[0].cantidades[0].cantidad,'8')
})

test('AGR-05: un período sin cosechas no inventa cantidades ni fechas', async () => {
  const db={registroProduccion:{count:async()=>0,findMany:async()=>[]}}
  const respuesta=await obtenerCosechasDashboard(6,1,10,db,new Date('2026-10-31T18:00:00Z'))
  assert.equal(respuesta.total,0)
  assert.equal(respuesta.totalPaginas,1)
  assert.deepEqual(respuesta.registros,[])
})
