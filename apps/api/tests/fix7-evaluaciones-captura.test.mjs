import assert from 'node:assert/strict'
import { test } from 'node:test'
import { datosEvaluacionDeCaptura } from '../dist/modules/agriculture/visit-evaluation-fields.js'

test('FIX7 recupera la etapa y calidad elegidas en la visita antigua', () => {
  const payload = { familyId: 21, crops: [
    { cicloCultivoId: 8, name: 'Apio', stage: 'Almácigo', quality: 'Bueno' },
    { cicloCultivoId: 9, name: 'Tomate', stage: 'Trasplantado', quality: 'Regular/Medio' },
  ] }
  assert.deepEqual(datosEvaluacionDeCaptura(payload, 8), { etapa: 'Almácigo', calidad: 'Bueno' })
  assert.deepEqual(datosEvaluacionDeCaptura(payload, 9), { etapa: 'Trasplantado', calidad: 'Regular/Medio' })
  assert.deepEqual(datosEvaluacionDeCaptura(payload, 10), { etapa: null, calidad: null })
})

test('FIX7 nunca atribuye datos de otra siembra ni inventa datos faltantes', () => {
  assert.deepEqual(datosEvaluacionDeCaptura(null, 8), { etapa: null, calidad: null })
  assert.deepEqual(datosEvaluacionDeCaptura({ crops: [] }, 8), { etapa: null, calidad: null })
  assert.deepEqual(datosEvaluacionDeCaptura({ crops: [{ cicloCultivoId: 8, stage: '', quality: 2 }] }, 8), { etapa: null, calidad: null })
  assert.deepEqual(datosEvaluacionDeCaptura({ crops: [
    { cicloCultivoId: 8, stage: 'Almácigo' },
    { cicloCultivoId: 8, stage: 'Trasplantado' },
  ] }, 8), { etapa: null, calidad: null })
})
