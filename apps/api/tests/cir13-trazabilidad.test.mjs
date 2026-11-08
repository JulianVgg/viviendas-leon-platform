import test from 'node:test'
import assert from 'node:assert/strict'
import { consolidarSemestre, definirPeriodo } from '../dist/modules/reports/semester.rules.js'
import { prepararTrazabilidadSemestral } from '../dist/modules/reports/semester.traceability.js'

const filtros = { anio: 2026, semestre: 2 }
const base = {
  cicloId: 9, cultivoId: 12, cultivo: 'Tomate', familiaId: 44, familia: 'Familia de ensayo',
  comunidadId: 7, comunidad: 'Comunidad de ensayo', huertoId: 3, huerto: 'Huerto principal',
  cantidadPlantas: 15, visitaOrigenId: 58, esDatoPrueba: false,
}
const cosecha = (id = 10, detalles = [{ id: 91, tipo: 'kg', cantidad: '10.500', unidadCodigo: 'KG' }]) => ({
  ...base, id, fechaInicio: '2026-11-02', fechaFin: '2026-11-02', observaciones: 'Sin incidencia', detalles,
})
const venta = (id = 20, moneda = 'GTQ', cantidad = '3', precio = '12.0000') => ({
  ...base, id, cosechaId: 10, fecha: '2026-11-05', tipo: 'kg', unidadCodigo: 'KG',
  cantidad, precioUnitario: precio, moneda, cantidadPrecios: 1, visitaOrigenId: 58, observaciones: 'Venta confirmada',
})
const informe = (cosechas, ventas) => ({
  ...consolidarSemestre(definirPeriodo(filtros), cosechas, ventas), filtros,
})

test('CIR-13: fila de cosecha identifica detalle, cosecha, ciclo, familia, comunidad y huerto', () => {
  const { filas, conciliacion } = prepararTrazabilidadSemestral(informe([cosecha()], []))
  assert.equal(filas.length, 1)
  assert.deepEqual({ tipo: filas[0].tipo, registroId: filas[0].registroId, detalleId: filas[0].detalleId,
    cosechaId: filas[0].cosechaId, cicloId: filas[0].cicloId, cultivoId: filas[0].cultivoId,
    familiaId: filas[0].familiaId, comunidadId: filas[0].comunidadId, huertoId: filas[0].huertoId,
    huerto: filas[0].huerto, visitaOrigenId: filas[0].visitaOrigenId },
  { tipo: 'COSECHA', registroId: 10, detalleId: 91, cosechaId: 10, cicloId: 9,
    cultivoId: 12, familiaId: 44, comunidadId: 7, huertoId: 3, huerto: 'Huerto principal', visitaOrigenId: 58 })
  assert.equal(filas[0].fecha, '2026-11-02')
  assert.equal(filas[0].cantidad, '10.5')
  assert.deepEqual(conciliacion.map(c => c.concepto), ['unidades','kg','manojos','GTQ','USD'])
  assert.equal(conciliacion[1].detalle, '10.5')
})

test('CIR-13: las ventas se vinculan a cosecha y registran precio e importe en moneda original', () => {
  const { filas, conciliacion } = prepararTrazabilidadSemestral(informe([cosecha()], [venta()]))
  const dato = filas.find(f => f.tipo === 'VENTA')
  assert.ok(dato)
  assert.equal(dato.registroId, 20)
  assert.equal(dato.cosechaId, 10)
  assert.equal(dato.detalleId, null)
  assert.equal(dato.moneda, 'GTQ')
  assert.equal(dato.importe, '36.00')
  assert.equal(dato.precioUnitario, '12.0000')
  assert.equal(dato.visitaOrigenId, 58)
  assert.equal(dato.observaciones, 'Venta confirmada')
  assert.equal(conciliacion[3].detalle, '36.00')
  assert.equal(conciliacion[4].detalle, '0.00')
})

test('CIR-13: cada unidad y moneda conserva su total independiente', () => {
  const d = [
    { id: 91, tipo: 'kg', cantidad: '10.125', unidadCodigo: 'KG' },
    { id: 92, tipo: 'unidades', cantidad: '7', unidadCodigo: 'UN' },
    { id: 93, tipo: 'manojos', cantidad: '2', unidadCodigo: 'MAN' },
  ]
  const { filas, conciliacion } = prepararTrazabilidadSemestral(informe([cosecha(10, d)], [
    venta(20, 'GTQ', '3', '12.0000'), venta(21, 'USD', '1', '1.5000'),
  ]))
  assert.equal(filas.length, 5)
  assert.deepEqual(conciliacion.map(c => c.detalle), ['7', '10.125', '2', '36.00', '1.50'])
})

test('CIR-13: venta de noviembre de cosecha de junio figura sin duplicar la cosecha', () => {
  const vieja = { ...cosecha(), fechaInicio: '2026-06-01', fechaFin: '2026-06-01' }
  const { filas, conciliacion } = prepararTrazabilidadSemestral(informe([vieja], [venta()]))
  assert.deepEqual(filas.map(f => f.tipo), ['VENTA'])
  assert.equal(filas[0].cosechaId, 10)
  assert.equal(conciliacion[1].detalle, '0')
  assert.equal(conciliacion[3].detalle, '36.00')
})

test('CIR-13: ventas sin importe verificable figuran sin inventar ingreso', () => {
  const incompleta = { ...venta(), precioUnitario: null, cantidadPrecios: 0 }
  const { filas, conciliacion } = prepararTrazabilidadSemestral(informe([cosecha()], [incompleta]))
  const filaVenta = filas.find(f => f.tipo === 'VENTA')
  assert.equal(filaVenta?.importe, null)
  assert.equal(conciliacion[3].detalle, '0.00')
})

test('CIR-13: cosechas de prueba, cruzadas o duplicadas no se inventan en detalle', () => {
  const prueba = { ...cosecha(11, [{ id: 92, tipo: 'kg', cantidad: '2', unidadCodigo: 'KG' }]),
    esDatoPrueba: true }
  const cruzada = { ...cosecha(12, [{ id: 93, tipo: 'kg', cantidad: '4', unidadCodigo: 'KG' }]),
    fechaInicio: '2026-06-30' }
  const { filas } = prepararTrazabilidadSemestral(informe([cosecha(), cosecha(), prueba, cruzada], []))
  assert.equal(filas.length, 1)
  assert.equal(filas[0].detalleId, 91)
})

test('CIR-13: un resumen manipulado detiene la exportación en vez de ocultar diferencias', () => {
  const i = informe([cosecha()], [venta()])
  i.resumen.totalVentasOriginalGTQ = '9999.99'
  assert.throws(() => prepararTrazabilidadSemestral(i), /no concuerda con el resumen/)
})

test('CIR-13: sin registros produce conciliación en cero y sin filas inventadas', () => {
  const { filas, conciliacion } = prepararTrazabilidadSemestral(informe([], []))
  assert.deepEqual(filas, [])
  assert.deepEqual(conciliacion.map(c => c.detalle), ['0', '0', '0', '0.00', '0.00'])
})
