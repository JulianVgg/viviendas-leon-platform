import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (name) => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8')

test('Huertos reúne ciclos, evaluaciones y producción sin listados duplicados', () => {
  const detail = read('features/agriculture/pages/HuertoDetallePage.tsx')
  const routes = read('app/routes.tsx')
  const navigation = read('app/navigation/navigation.tsx')
  assert.match(detail, /CicloEvaluacionesSection/)
  assert.match(detail, /CicloProduccionSection/)
  assert.match(detail, /RegistrarCosechaDialog/)
  assert.match(routes, /gestion-agricola\/ciclos.*Navigate to/)
  assert.match(routes, /gestion-agricola\/produccion.*LegacyProductionRedirect/)
  assert.doesNotMatch(navigation, /name: 'Ciclos agrícolas'|name: 'Producción'/)
})

test('las ventas se consultan por ciclo y se muestran junto a su cosecha', () => {
  const view = read('features/agriculture/components/CicloProduccionSection.tsx')
  assert.match(view, /listSales\(controller\.signal, cicloId\)/)
  assert.match(view, /sale\.registroProduccionId === record\.id/)
  assert.match(view, /Venta #|Ventas registradas/)
})

test('la visita conserva estimaciones distintas y envía movimientos reales si se confirman', () => {
  const view = read('features/visits/pages/VisitRegisterPage.tsx')
  assert.match(view, /validarMovimientoParaVisita/)
  assert.match(view, /movimientoReal: movimientos\.get\(c\.id\)/)
  assert.match(view, /movimientoProduccion/)
  assert.match(view, /currencyTotal/)
})
