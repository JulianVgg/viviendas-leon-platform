import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const form = readFileSync(new URL('../src/features/visits/pages/VisitRegisterPage.tsx', import.meta.url), 'utf8')
const evaluation = readFileSync(new URL('../src/features/agriculture/components/CicloEvaluacionesSection.tsx', import.meta.url), 'utf8')

test('mantiene el bloque original de estimación sin segundo formulario económico', () => {
  assert.match(form, /Producción estimada<\/summary>/u)
  assert.doesNotMatch(form, /VisitEconomicsFields|Cosecha y venta reales|¿Hubo cosecha o venta real\?/u)
})
test('las estimaciones de visitas siguen relacionadas con ciclos y visibles en AGR-06', () => {
  assert.match(form, /cicloCultivoId:\s*c\.cicloCultivoId/u)
  assert.match(evaluation, /Producción estimada de la visita/u)
  assert.match(evaluation, /No representa cosecha ni venta confirmada/u)
})
