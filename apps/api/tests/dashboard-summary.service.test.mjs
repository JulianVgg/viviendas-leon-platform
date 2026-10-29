import test from 'node:test'
import assert from 'node:assert/strict'
import { obtenerResumenDashboard } from '../dist/modules/dashboard/dashboard-summary.service.js'

function mockDB() {
  const consultas = []
  return { consultas, visita: {
    findMany: async args => { consultas.push(['visitas', args.where]); return [{fecha:new Date('2026-10-08T00:00:00Z'),estado:'REALIZADA'}] },
    count: async args => { consultas.push(['vencidas', args.where]); return 1 },
  }, capacitacion:{findMany:async args => { consultas.push(['capacitaciones',args.where]); return [] }},
    familia:{count:async () => 19}, huerto:{count:async () => 12}, cicloCultivo:{count:async () => 8},
    programa:{findMany:async () => [{ id:1, nombre:'Seguridad alimentaria', _count:{familias:19} }]},
  }
}

test('técnico solo consulta sus visitas y capacitaciones, sin datos institucionales', async () => {
  const db = mockDB()
  const resultado = await obtenerResumenDashboard({id:7,roles:['Técnico agropecuario'],permisos:[]}, 6, db)
  assert.equal(resultado.alcance, 'PERSONAL')
  assert.equal(resultado.indicadores.familias, null)
  assert.deepEqual(resultado.programas, [])
  assert.deepEqual(db.consultas.map(([,where]) => where.usuarioResponsableId), [7,7,7])
})

test('dirección consulta indicadores institucionales', async () => {
  const db=mockDB()
  const resultado = await obtenerResumenDashboard({id:1,roles:['Dirección general'],permisos:[]},3,db)
  assert.equal(resultado.alcance,'INSTITUCIONAL')
  assert.equal(resultado.indicadores.familias,19)
  assert.equal(resultado.programas[0].familias,19)
  assert.ok(db.consultas.every(([,where])=>!('usuarioResponsableId' in where)))
})
