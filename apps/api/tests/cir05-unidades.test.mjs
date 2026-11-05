import test from 'node:test'
import assert from 'node:assert/strict'
import { harvestUnitKind, isOfficialHarvestUnit, harvestQuantityError } from '../dist/modules/agriculture/production.units.js'
import { planUnidades } from '../scripts/cir-05-unidades-lib.mjs'
import { resumirAgricultura } from '../dist/modules/dashboard/agriculture-production.rules.js'

const unit = (codigo, nombre, abreviatura, activo = true) => ({ codigo, nombre, abreviatura, activo })
test('CIR-05: diferencia kg, unidades, manojos y otras unidades', () => {
  assert.equal(harvestUnitKind(unit('KG', 'Kilogramo', 'kg')), 'kg')
  assert.equal(harvestUnitKind(unit('UNIDAD', 'Unidad', 'u')), 'unidades')
  assert.equal(harvestUnitKind(unit('MANOJO', 'Manojo', 'manojo')), 'manojos')
  assert.equal(harvestUnitKind(unit('LITRO', 'Litro', 'l')), 'otra')
  assert.equal(harvestUnitKind(unit('KG', 'Manojo', 'kg')), 'otra')
  assert.equal(harvestUnitKind(unit('PLANTA', 'Planta', 'pl')), 'otra')
})
test('CIR-05: no ofrece unidades sintéticas, inactivas ni destinadas a insumos', () => {
  assert.equal(isOfficialHarvestUnit(unit('SYN-KG', 'Kilogramo sintético', 'kg')), false)
  assert.equal(isOfficialHarvestUnit(unit('KG', 'Kilogramo', 'kg', false)), false)
  assert.equal(isOfficialHarvestUnit(unit('LITRO', 'Litro', 'l')), false)
  assert.equal(isOfficialHarvestUnit(unit('KG', 'Kilogramo', 'kg')), true)
})
test('CIR-05: cantidad con precisión de kg y conteos enteros', () => {
  assert.equal(harvestQuantityError('0.001', 'kg'), null)
  assert.equal(harvestQuantityError('999999999.999', 'kg'), null)
  assert.equal(harvestQuantityError('7', 'unidades'), null)
  assert.equal(harvestQuantityError('12', 'manojos'), null)
  for (const kind of ['unidades', 'manojos']) {
    assert.match(harvestQuantityError('7.5', kind), /enteros/)
    assert.match(harvestQuantityError('2.000', kind), /enteros/)
  }
  for (const quantity of ['', '0', '-1', '1e3', '5,2', '1.0001']) assert.ok(harvestQuantityError(quantity, 'kg'))
  assert.ok(harvestQuantityError('1', 'otra'))
})
test('CIR-05: el plan ignora sintéticas pero no duplica equivalentes reales', () => {
  const soloSinteticas = [unit('SYN-KG', 'Kilogramo sintético', 'kg'), unit('SYN-UND', 'Unidad sintética', 'u')].map((x,i)=>({...x,id:i+1}))
  assert.equal(planUnidades(soloSinteticas).resumen.crear, 3)
  const existente = [...soloSinteticas, { ...unit('KILO', 'Kilogramo', 'kg'), id: 10 }]
  assert.deepEqual(planUnidades(existente).resumen, { crear: 2, existentes: 1, revisar: 0 })
  assert.equal(planUnidades([...existente, { ...unit('KG', 'Kilogramo', 'kg'), id: 11 }]).resumen.revisar, 1)
  assert.equal(planUnidades([{ ...unit('MANOJO', 'Manojo', 'manojo', false), id: 9 }]).resumen.revisar, 1)
  assert.equal(planUnidades([{ ...unit('KG', 'Manojo', 'kg'), id: 7 }]).resumen.revisar, 1)
})
test('CIR-05: manojos se suman aparte; cantidades faltantes no pasan como cero válido', () => {
  const ciclos = [{ id:1, estado:'ACTIVO', cantidadPlantas:null, cultivo:{id:1,nombre:'Lechuga'},
    huerto:{familia:{id:1,comunidad:{nombre:'Los Planes'}}} }]
  const fechaFinPeriodo = new Date('2026-10-25T00:00:00.000Z')
  const producciones = [{ id:1, fechaFinPeriodo, cicloCultivo:{cultivo:{id:1,nombre:'Lechuga'}}, detalles: [
    { cantidadTotal:'0.001', unidadMedida:{codigo:'KG', abreviatura:'kg'} },
    { cantidadTotal:'7', unidadMedida:{codigo:'MANOJO', abreviatura:'manojo'} },
    { cantidadTotal:null, unidadMedida:{codigo:'UNIDAD', abreviatura:'u'} },
  ] }]
  const result = resumirAgricultura(ciclos, producciones, ['2026-10'])
  assert.equal(result.indicadores.produccionKg, 0.001)
  assert.equal(result.indicadores.produccionUnidades, 0)
  assert.equal(result.indicadores.produccionManojos, 7)
  assert.equal(result.indicadores.plantasSinDato, 1)
  assert.equal(result.indicadores.cantidadesInvalidas, 1)
  assert.equal(result.produccionMensual[0].manojos, 7)
})
