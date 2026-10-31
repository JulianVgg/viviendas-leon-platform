import test from 'node:test'
import assert from 'node:assert/strict'
import { agregarFiltrosDashboard, filtrosVacios } from '../src/features/dashboard/lib/dashboardFilters.ts'

test('MON-05 serializa los mismos criterios para gráficos y detalle de tarjetas',()=>{
  const params=agregarFiltrosDashboard(new URLSearchParams({meses:'6'}),{comunidadId:12,responsableId:7})
  assert.equal(params.toString(),'meses=6&comunidadId=12&responsableId=7')
})
test('MON-05 permite restablecer filtros, omite IDs inválidos',()=>{
  assert.equal(agregarFiltrosDashboard(new URLSearchParams({meses:'6'}),{}).toString(),'meses=6')
  assert.equal(agregarFiltrosDashboard(new URLSearchParams(),{comunidadId:-2,responsableId:2.4}).toString(),'')
  assert.equal(filtrosVacios({}),true)
  assert.equal(filtrosVacios({comunidadId:1}),false)
})
