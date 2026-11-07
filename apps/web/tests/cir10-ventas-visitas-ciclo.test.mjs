import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (name) => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8')

test('la pantalla Producción no ofrece ventas ni captura manual de tipo de cambio', () => {
  const view = read('features/agriculture/pages/ProduccionPage.tsx')
  assert.doesNotMatch(view, /<SalesPanel|<ExchangeRatesPanel/)
  assert.match(view, /Historial de cosechas/)
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
  assert.match(view, /movimientoReal: c\.movimientoReal/)
  assert.match(view, /VisitEconomicsFields/)
  assert.match(view, /estimatedSaleQ|currencyTotal/)
})
