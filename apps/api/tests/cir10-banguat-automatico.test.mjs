import test from 'node:test'
import assert from 'node:assert/strict'
import { parseBanguatRates, fetchBanguatRates } from '../src/modules/agriculture/banguat-rates.ts'

const fixture = `<?xml version="1.0"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>
 <TipoCambioRangoResponse><CambioDolar>
  <VarDolar><fecha>05/11/2026</fecha><referencia>7.64243</referencia></VarDolar>
  <VarDolar><fecha>06/11/2026</fecha><referencia>7.64500</referencia></VarDolar>
 </CambioDolar></TipoCambioRangoResponse></soap:Body></soap:Envelope>`

test('interpreta tasas del rango histórico del Banguat', () => {
  assert.deepEqual(parseBanguatRates(fixture), [
    { fecha: '2026-11-05', quetzalesPorDolar: '7.64243' },
    { fecha: '2026-11-06', quetzalesPorDolar: '7.64500' },
  ])
})

test('descarta fechas imposibles, tasas no numéricas y respuestas de error', () => {
  assert.deepEqual(parseBanguatRates('<Fault>servicio inactivo</Fault>'), [])
  assert.deepEqual(parseBanguatRates(`
    <VarDolar><fecha>31/02/2026</fecha><referencia>7.5</referencia></VarDolar>
    <VarDolar><fecha>12/11/2026</fecha><referencia>NaN</referencia></VarDolar>
    <VarDolar><fecha>14/11/2026</fecha><referencia>0</referencia></VarDolar>`), [])
})

test('consulta solo fechas solicitadas sin enviar información personal', async () => {
  let requests = 0
  const mocked = async (url, options) => {
    requests++
    assert.match(url, /banguat\.gob\.gt/)
    assert.equal(options.method, 'POST')
    assert.match(options.body, /<fechainit>05\/11\/2026<\/fechainit>/)
    assert.match(options.body, /<fechafin>06\/11\/2026<\/fechafin>/)
    assert.doesNotMatch(options.body, /familia|correo|usuario/i)
    return { ok: true, headers: new Headers(), text: async () => fixture }
  }
  assert.deepEqual(await fetchBanguatRates(['2026-11-06', '2026-11-05'], mocked), parseBanguatRates(fixture))
  assert.equal(requests, 1)
  assert.deepEqual(await fetchBanguatRates(['2026-11-06'], mocked), []) // Evita solicitudes repetidas.
  assert.equal(requests, 1)
})
