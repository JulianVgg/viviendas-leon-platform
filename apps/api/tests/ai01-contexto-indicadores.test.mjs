import test from 'node:test'
import assert from 'node:assert/strict'
import {
  construirContextoIndicadoresIA, validarParametrosContextoIA,
  VERSION_CONTEXTO_IA,
} from '../dist/modules/ai/indicator-context.rules.js'
import { consolidarIndicadoresIA } from '../dist/modules/ai/indicator-context.service.js'

const fecha = new Date('2026-11-04T15:00:00.000Z')
const direccion = { id: 1, roles: ['Dirección general'], permisos: [], correo: 'personal@ejemplo.gt' }
const tecnico = { id: 7, roles: ['Técnico agropecuario'], permisos: [] }

function fuentes() {
  return {
    resumen: {
      alcance: 'INSTITUCIONAL', periodo: { meses: 3, desde: '2026-08-01', hasta: '2026-11-04' },
      indicadores: { familias: 5, huertosActivos: 3, ciclosActivos: 2, visitasRealizadas: 4, capacitaciones: 2, visitasVencidas: 1 },
      actividadMensual: [{ mes: '2026-10', visitas: 4, capacitaciones: 2, etiqueta: 'Octubre - Familia López' }],
      programas: [{ id: 5, nombre: 'Nombre Apellido 5555-4444', familias: 3 }],
    },
    familias: {
      totalFamilias: 5, familiasConPrograma: 3, familiasSinPrograma: 2, porcentajeCobertura: 60,
      programas: [{ id: 5, nombre: 'Nombre Apellido 5555-4444', familias: 3, porcentaje: 60 }],
      comunidades: [{ nombre: 'Familia Secreta', total: 5, conPrograma: 3 }],
    },
    actividad: {
      alcance: 'INSTITUCIONAL', periodo: { meses: 3, desde: '2026-08-01', hasta: '2026-10-31' },
      visitas: { realizadas: 4, programadas: 1, vencidas: 1, reprogramadas: 2 },
      capacitaciones: { realizadas: 2, programadas: 1, otras: 0 },
      porResponsable: [{ id: '7', nombre: 'Persona identificable', visitas: 4, capacitaciones: 2 }],
    },
    agricultura: {
      periodo: { meses: 3, desde: '2026-08-01', hasta: '2026-11-04' },
      indicadores: { ciclosRegistrados: 4, ciclosActivos: 2, ciclosFinalizados: 2,
        variedadesActivas: 2, familiasConSiembras: 3, plantasActivas: 100, registrosProduccion: 2,
        produccionKg: 12.5, produccionUnidades: 40, unidadesNoComparables: 1 },
      visitasConProduccion: 1,
      porCultivo: [{ id: 2, nombre: 'Persona por cultivo', activos: 2, ciclos: 4, plantas: 100, kg: 12.5, unidades: 40 }],
      porComunidad: [{ nombre: 'Nombre familiar', familias: 3, ciclosActivos: 2 }],
      produccionMensual: [{ mes: '2026-10', kg: 12.5, unidades: 40, registros: 2 }],
    },
    alertas: { fechaHoy: '2026-11-04', indicadores: { visitasVencidas: 1, compromisosPendientes: 3, compromisosVencidos: 1 },
      visitas: [{ titulo: 'Nombre familiar privado' }], compromisos: [{ texto: 'Observación privada' }] },
  }
}
const opciones = { meses: 3, comunidadFiltrada: true, responsableFiltrado: false, generadoEn: fecha }

test('AI-01.1 genera JSON con origen, unidades y períodos distintos', () => {
  const datos = construirContextoIndicadoresIA(fuentes(), opciones)
  assert.equal(datos.version, VERSION_CONTEXTO_IA)
  assert.equal(datos.periodos.actividad.hasta, '2026-10-31')
  assert.equal(datos.periodos.agricultura.hasta, '2026-11-04')
  assert.equal(datos.agricultura.produccionConfirmada.kg, 12.5)
  assert.equal(datos.agricultura.produccionConfirmada.unidades, 40)
  assert.equal(datos.agricultura.visitasQueReportanProduccion, 1)
  assert.equal(datos.alertas.compromisosPendientes, 3)
  assert.equal(datos.filtros.comunidad, 'FILTRADA')
  assert.equal(datos.familias.porPrograma[0].referencia, 'PROGRAMA_5')
  assert.equal(JSON.parse(JSON.stringify(datos)).alcance, 'INSTITUCIONAL')
  assert.ok(datos.advertencias.some(a => a.includes('fin del mes en curso')))
})

test('AI-01.1 elimina por lista blanca nombres, teléfonos, observaciones, correos y IDs personales', () => {
  const json = JSON.stringify(construirContextoIndicadoresIA(fuentes(), opciones))
  for (const sensible of ['Nombre Apellido', '5555-4444', 'Familia Secreta', 'Persona identificable',
    'Observación privada', 'Nombre familiar', 'Persona por cultivo', 'Octubre - Familia López', 'personal@ejemplo.gt']) {
    assert.ok(!json.includes(sensible), `Se filtró indebidamente: ${sensible}`)
  }
  assert.ok(!json.includes('porResponsable'))
  assert.ok(!json.includes('usuarioId'))
})

test('AI-01.1 rechaza indicadores inconsistentes o no finitos, sin reemplazarlos por ceros', () => {
  const a = fuentes()
  a.familias.familiasConPrograma = 7
  assert.throws(() => construirContextoIndicadoresIA(a, opciones), /cobertura.*consistente/i)
  a.familias.familiasConPrograma = 3
  a.agricultura.indicadores.produccionKg = Number.NaN
  assert.throws(() => construirContextoIndicadoresIA(a, opciones), /indicador inválido/i)
  a.agricultura.indicadores.produccionKg = 12.5
  a.alertas.indicadores.compromisosVencidos = 9
  assert.throws(() => construirContextoIndicadoresIA(a, opciones), /exceden/i)
})

test('AI-01.1 solo admite períodos soportados y filtros válidos', () => {
  for (const meses of [0, 2, 4, 100, Number.NaN, 6.5]) {
    assert.throws(() => validarParametrosContextoIA(meses, {}), /período/i)
  }
  assert.doesNotThrow(() => validarParametrosContextoIA(12, { comunidadId: 4, responsableId: 7 }))
  assert.throws(() => validarParametrosContextoIA(3, { responsableId: -1 }), /filtro/i)
  assert.throws(() => validarParametrosContextoIA(3, { comunidadId: 0 }), /filtro/i)
})

test('AI-01.1 nunca consulta PostgreSQL para usuarios no autorizados', async () => {
  const fake = new Proxy({}, { get() { throw new Error('NO CONSULTAR') } })
  await assert.rejects(consolidarIndicadoresIA(tecnico, 3, {}, fake, fecha), /no autorizado/i)
  await assert.rejects(consolidarIndicadoresIA(direccion, 5, {}, fake, fecha), /período/i)
})

test('AI-01.1 consolida desde los seis MON con filtros y fechas de corte homogéneas', async () => {
  const consultas = []
  const db = {
    visita: {
      count: async ({ where }) => { consultas.push(['visita.count', where]); return 0 },
      findMany: async ({ where }) => { consultas.push(['visita.findMany', where]); return [] },
    },
    capacitacion: { findMany: async ({ where }) => { consultas.push(['capacitacion', where]); return [] } },
    familia: {
      count: async ({ where }) => { consultas.push(['familia.count', where]); return 0 },
      findMany: async ({ where }) => { consultas.push(['familia.findMany', where]); return [] },
    },
    huerto: { count: async () => 0 },
    cicloCultivo: { count: async () => 0, findMany: async () => [] },
    programa: { findMany: async () => [] },
    registroProduccion: { findMany: async () => [] },
    visitaCaptura: { findMany: async () => [] },
    seguimientoVisita: { count: async () => 0, findMany: async () => [] },
  }
  const datos = await consolidarIndicadoresIA(direccion, 3, { comunidadId: 2, responsableId: 7 }, db, fecha)
  assert.equal(datos.familias.registradas, 0)
  assert.equal(datos.visitas.realizadas, 0)
  assert.equal(datos.alertas.visitasVencidasActuales, 0)
  assert.equal(datos.periodos.dashboard.hasta, '2026-11-04')
  assert.equal(datos.periodos.actividad.hasta, '2026-11-30')
  assert.ok(consultas.find(([tipo, where]) => tipo === 'familia.count' && where.comunidadId === 2))
  assert.ok(consultas.find(([tipo, where]) => tipo === 'capacitacion' && where.usuarioResponsableId === 7))
  assert.equal(datos.filtros.responsable, 'FILTRADO')
  assert.ok(!JSON.stringify(datos).includes('"responsableId"'))
})
