import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('../src/modules/notifications/', import.meta.url)
const importar = async (file, deps = {}) => {
  const original = readFileSync(fileURLToPath(new URL(file, root)), 'utf8')
  const js = ts.transpileModule(original, { compilerOptions: {
    module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
  } }).outputText.replace(/import\s+(?:type\s+)?[\s\S]*?\s+from\s+['"][^'"]+['"];?\s*/g, '')
  const codigo = `const { ${Object.keys(deps).join(', ')} } = globalThis.__ntf08deps;\n${js}`
  globalThis.__ntf08deps = deps
  try { return await import(`data:text/javascript;base64,${Buffer.from(codigo).toString('base64')}`) }
  finally { delete globalThis.__ntf08deps }
}
const rules = await importar('overdue-visits.rules.ts')
const worker = await importar('overdue-visits.worker.ts', {
  getPrismaClient: () => { throw new Error('No acceder a PostgreSQL') }, ...rules,
})
const fecha = date => new Date(`${date}T12:00:00Z`)
const tecnico = { id: 7, estado: 'ACTIVO', roles: [{ rol: { nombre: 'Técnico agropecuario', permisos: [
  { permiso: { codigo: 'PANTALLA_VISITAS_AGENDA' } }, { permiso: { codigo: 'VISITAS_READ' } },
] } }] }
const direccion = { id: 8, estado: 'ACTIVO', roles: [{ rol: { nombre: 'Dirección general', permisos: [] } }] }
const coord = { id: 9, estado: 'ACTIVO', roles: [{ rol: { nombre: 'Coordinadora del Programa Agroforestal', permisos: [] } }] }
const otro = { id: 10, estado: 'ACTIVO', roles: [] }

function simular({ visitas = [{ id: 11, fecha: fecha('2026-10-20'), estado: 'PROGRAMADA', usuarioResponsableId: 7,
  familia: { nombreReferencia: 'Familia A' } }], usuarios = [tecnico,direccion,coord,otro] } = {}) {
  const notificaciones = []
  let falla = false
  let transacciones = 0
  const tx = {
    $queryRaw: async () => [{ id: 11 }],
    visita: { findUnique: async ({where}) => visitas.find(v => v.id === where.id) ?? null },
    usuario: { findMany: async () => usuarios },
    notificacion: {
      createMany: async ({data,skipDuplicates}) => {
        if (falla) throw new Error('Fallo temporal')
        assert.equal(skipDuplicates,true)
        let count = 0
        for (const n of data) {
          if (!notificaciones.some(x => x.claveEvento === n.claveEvento)) { count++; notificaciones.push(n) }
        }
        return {count}
      },
      updateMany: async ({where,data}) => {
        const targets = notificaciones.filter(n => n.claveEvento.startsWith(where.claveEvento.startsWith) && !n.fechaLectura)
        targets.forEach(n => n.fechaLectura=data.fechaLectura)
        return {count:targets.length}
      },
    },
  }
  const db = {
    visita: { findMany: async ({where, cursor, skip, take}) => {
      const filtradas = visitas.filter(v => v.estado === where.estado && v.fecha < where.fecha.lt).sort((a,b)=>a.id-b.id)
      const restantes = cursor && skip ? filtradas.filter(v => v.id > cursor.id) : filtradas
      return restantes.slice(0,take).map(v => ({id:v.id}))
    } },
    $transaction: async callback => { transacciones++; return callback(tx) },
  }
  return { db, tx, visitas, notificaciones, setFalla: value => {falla=value}, getTransacciones: () => transacciones }
}

test('solo PROGRAMADA y fecha anterior a hoy Guatemala vence', () => {
  assert.equal(rules.hoyEnGuatemala(new Date('2026-10-22T05:59:59Z')), '2026-10-21')
  assert.equal(rules.hoyEnGuatemala(new Date('2026-10-22T06:00:00Z')), '2026-10-22')
  assert.equal(rules.visitaVencida('PROGRAMADA','2026-10-21','2026-10-22'),true)
  assert.equal(rules.visitaVencida('PROGRAMADA','2026-10-22','2026-10-22'),false)
  assert.equal(rules.visitaVencida('REALIZADA','2026-10-19','2026-10-22'),false)
  assert.equal(rules.visitaVencida('NO_CUMPLIO','2026-10-19','2026-10-22'),false)
})

test('roles activos y permisos de lectura para emitir avisos', () => {
  assert.equal(rules.puedeConsultarVisitas(tecnico.roles.map(r=>r.rol)),true)
  assert.equal(rules.puedeConsultarVisitas(direccion.roles.map(r=>r.rol)),true)
  assert.equal(rules.puedeConsultarVisitas(coord.roles.map(r=>r.rol)),true)
  assert.equal(rules.puedeConsultarVisitas(otro.roles.map(r=>r.rol)),false)
  assert.equal(rules.puedeConsultarVisitas([{nombre:'Técnico',permisos:[{permiso:{codigo:'PANTALLA_VISITAS_AGENDA'}}]}]),false)
})

test('emite avisos para técnico, Dirección y Coordinación, sin otros usuarios', async () => {
  const datos=simular()
  const cuenta=await worker.procesarUnaVisitaVencida(datos.db,11,new Date('2026-10-22T14:00:00Z'))
  assert.equal(cuenta,3)
  assert.deepEqual(datos.notificaciones.map(n=>n.usuarioId).sort(),[7,8,9])
  assert.equal(datos.notificaciones[0].tipo,'VISITA_VENCIDA')
  assert.equal(datos.notificaciones[0].referencia,'/visitas/agenda')
})

test('múltiples ejecuciones y reinicio no duplican notificaciones', async () => {
  const datos=simular()
  const ahora=new Date('2026-10-22T14:00:00Z')
  assert.equal(await worker.procesarVisitasVencidas(datos.db,ahora).then(r=>r.generadas),3)
  assert.equal(await worker.procesarVisitasVencidas(datos.db,ahora).then(r=>r.generadas),0)
  assert.equal(datos.notificaciones.length,3)
})

test('visita reprogramada o realizada antes de la transacción no alerta', async () => {
  const datos=simular()
  datos.visitas[0].fecha=fecha('2026-10-25')
  assert.equal(await worker.procesarUnaVisitaVencida(datos.db,11,new Date('2026-10-22T14:00:00Z')),0)
  datos.visitas[0].fecha=fecha('2026-10-20'); datos.visitas[0].estado='REALIZADA'
  assert.equal(await worker.procesarUnaVisitaVencida(datos.db,11,new Date('2026-10-22T14:00:00Z')),0)
  assert.equal(datos.notificaciones.length,0)
})

test('marca como leídos avisos pendientes al registrar o reprogramar', async () => {
  const datos=simular()
  await worker.procesarUnaVisitaVencida(datos.db,11,new Date('2026-10-22T14:00:00Z'))
  await worker.resolverAvisosVisitaVencida(datos.tx,11)
  assert.ok(datos.notificaciones.every(n=>n.fechaLectura instanceof Date))
})

test('fallo transitorio no registra envío y se reintenta', async () => {
  const datos=simular()
  datos.setFalla(true)
  const primero=await worker.procesarVisitasVencidas(datos.db,new Date('2026-10-22T14:00:00Z'))
  assert.equal(primero.errores,1)
  assert.equal(datos.notificaciones.length,0)
  datos.setFalla(false)
  const segundo=await worker.procesarVisitasVencidas(datos.db,new Date('2026-10-22T14:00:00Z'))
  assert.equal(segundo.generadas,3)
})

test('paginación visita más de 200 registros sin perder pendientes', async () => {
  const visitas=Array.from({length: 210}, (_,i)=>({id:i+1,fecha:fecha('2026-10-20'),estado:'PROGRAMADA',usuarioResponsableId:7,familia:{nombreReferencia:'Familia A'}}))
  const datos=simular({visitas,usuarios:[tecnico]})
  datos.tx.$queryRaw=async()=>[{id:1}]
  const resultado=await worker.procesarVisitasVencidas(datos.db,new Date('2026-10-22T14:00:00Z'))
  assert.equal(resultado.revisadas,210)
  assert.equal(resultado.errores,0)
})

test('clave única distingue responsables y nueva fecha al reprogramar', () => {
  assert.notEqual(rules.claveAvisoVisitaVencida(2,'2026-10-21',7),rules.claveAvisoVisitaVencida(2,'2026-10-22',7))
  assert.notEqual(rules.claveAvisoVisitaVencida(2,'2026-10-21',7),rules.claveAvisoVisitaVencida(2,'2026-10-21',8))
})

test('supervisión muestra visitas de todo el equipo solo a Dirección y Coordinación', async () => {
  const source = readFileSync(fileURLToPath(new URL('../src/modules/dashboard/my-agenda.service.ts', import.meta.url)), 'utf8')
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace(/import\s+(?:type\s+)?[\s\S]*?\s+from\s+['"][^'"]+['"];?\s*/g, '')
  const svc = await import(`data:text/javascript;base64,${Buffer.from('const esDireccionGeneral = roles => roles.includes("Dirección general");\n' + js).toString('base64')}`)
  const llamadas=[]
  const db={
    eventoInstitucional:{findMany:async()=>[]},
    visita:{
      findMany: async q=>{ llamadas.push(q.where); return q.where.usuarioResponsableId ? [] : [{id:4,fecha:fecha('2026-10-19'),usuarioResponsable:{nombre:'Ana',apellido:'García'},familia:{nombreReferencia:'Familia B',comunidad:{nombre:'Los Planes'}}}] },
      count:async q=>{llamadas.push(q.where);return q.where.usuarioResponsableId?0:1},
    },
    seguimientoVisita:{findMany:async()=>[],count:async()=>0},
  }
  const persona = {id:7,roles:['Dirección general'],permisos:[]}
  const result = await svc.obtenerMiAgenda(persona,new Date('2026-10-22T14:00:00Z'),db)
  assert.equal(result.supervision.visitasVencidas,1)
  assert.equal(result.supervision.visitas[0].tecnico,'Ana García')
  assert.ok(llamadas.some(w=>w.estado==='PROGRAMADA' && !('usuarioResponsableId' in w)))
  const sinPermiso=await svc.obtenerMiAgenda({id:99,roles:[],permisos:[]},new Date('2026-10-22T14:00:00Z'),db)
  assert.equal(sinPermiso.supervision,null)
})
