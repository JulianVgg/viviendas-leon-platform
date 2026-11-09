import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const form = readFileSync(new URL('../src/features/visits/pages/VisitRegisterPage.tsx', import.meta.url), 'utf8')
const evaluation = readFileSync(new URL('../src/features/agriculture/components/CicloEvaluacionesSection.tsx', import.meta.url), 'utf8')

test('consolida estimaciones y cosechas en un solo desplegable con selección exclusiva', () => {
  assert.equal((form.match(/<summary[^>]*>Producción agrícola<\/summary>/gu) ?? []).length, 1)
  assert.match(form, /production-mode-/u)
  assert.match(form, /<option value="estimacion">Producción estimada<\/option>/u)
  assert.match(form, /hideModeSelector cycleId=/u)
  assert.doesNotMatch(form, /Registrar estimación|Registrar cosecha o venta real/u)
})
test('las estimaciones de visitas siguen relacionadas con ciclos y visibles en AGR-06', () => {
  assert.match(form, /cicloCultivoId:\s*c\.cicloCultivoId/u)
  assert.match(evaluation, /Producción estimada de la visita/u)
  assert.match(evaluation, /No representa cosecha ni venta confirmada/u)
})
