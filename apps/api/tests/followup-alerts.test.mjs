import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('../src/modules/notifications/', import.meta.url)
function codigo(path) {
  return ts.transpileModule(readFileSync(fileURLToPath(new URL(path, root)), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
}
async function cargar(codigoTs, variables = {}) {
  // Inyectar dependencias simuladas para probar las reglas reales sin iniciar Prisma.
  const nombres = Object.keys(variables)
  const js = codigoTs.replace(/import\s+\{[\s\S]*?\}\s+from\s+['"][^'"]+['"];?\s*/g, '')
    .replace(/import\s+[^\n]+from\s+['"][^'"]+['"];?\s*/g, '')
  const wrapper = `const { ${nombres.join(', ')} } = globalThis.__depsNTF07;\n${js}`
  globalThis.__depsNTF07 = variables
  try { return await import(`data:text/javascript;base64,${Buffer.from(wrapper).toString('base64')}`) }
  finally { delete globalThis.__depsNTF07 }
}

const rules = await cargar(codigo('followup-alerts.rules.ts'))
const { fechaLocalGuatemala, calcularFechaAviso, debeEmitirAviso, descripcionAvisoSeguimiento, puedeRecibirAvisosSeguimiento } = rules
const service = await cargar(codigo('followup-alerts.service.ts'), {
  getPrismaClient: () => { throw new Error('No usar Prisma real') },
  ...rules,
})
const worker = await cargar(codigo('followup-alerts.worker.ts'), {
  getPrismaClient: () => { throw new Error('No usar Prisma real') },
  ...rules,
  resultadoFallo: (intent, fecha) => intent + 1 >= 5
    ? { estado: 'ERROR', proximoIntento: null }
    : { estado: 'PENDIENTE', proximoIntento: new Date(fecha.getTime() + 60_000 * 2 ** intent) },
  reconciliarAvisosSeguimiento: async () => {},
})

const visita = { usuarioResponsableId: 5, familia: { nombreReferencia: 'Familia A' } }
const due = new Date('2026-10-24T12:00:00Z')
const seguimiento = (estado = 'PENDIENTE', fecha = due) => ({ id: '12345678-1234-4234-8234-123456789abc', texto: 'Verificar abono', responsable: 'Familia', estado, fechaLimite: fecha, visitaOrigen: visita })
const key = (row, tipo) => `${row.id}:${tipo}`
function scheduler(rows = [seguimiento()]) {
  const avisos = []
  const tx = {
    seguimientoVisita: { findMany: async ({where}) => rows.filter(x => where.id.in.includes(x.id)) },
    avisoSeguimiento: {
      updateMany: async ({ where, data }) => {
        for (const a of avisos) {
          if (a.estado !== where.estado) continue
          if (where.seguimientoId?.in && !where.seguimientoId.in.includes(a.seguimientoId)) continue
          if (where.seguimientoId && typeof where.seguimientoId === 'string' && a.seguimientoId !== where.seguimientoId) continue
          const exclusion = where.OR?.some(c =>
            (c.fechaLimite && c.fechaLimite.not?.getTime() !== a.fechaLimite.getTime()) ||
            (c.usuarioId && c.usuarioId.not !== a.usuarioId) ||
            (c.tipo && c.tipo === a.tipo))
          if (where.OR && !exclusion) continue
          a.estado = data.estado
        }
      },
      findUnique: async ({where}) => {
        const w = where.seguimientoId_usuarioId_tipo_fechaLimite
        return avisos.find(a => a.seguimientoId === w.seguimientoId && a.tipo === w.tipo && a.usuarioId === w.usuarioId && a.fechaLimite.getTime() === w.fechaLimite.getTime()) || null
      },
      upsert: async ({create, update, where}) => {
        const w = where.seguimientoId_usuarioId_tipo_fechaLimite
        const prev = avisos.find(a => a.seguimientoId === w.seguimientoId && a.tipo === w.tipo && a.usuarioId === w.usuarioId && a.fechaLimite.getTime() === w.fechaLimite.getTime())
        if (prev) Object.assign(prev, update)
        else avisos.push({ ...create, intentos: 0 })
      },
    },
  }
  return { rows, avisos, tx }
}

function workerDB({ tipo = 'VENCIDO', estado = 'PENDIENTE', user = null, seg = null, fail = false } = {}) {
  const vencimientoHistorico = new Date('2026-09-24T12:00:00Z')
  const aviso = { id: 15, tipo, usuarioId: 5, seguimientoId: seguimiento().id,
    fechaLimite: vencimientoHistorico, estado, intentos: 0 }
  const notificaciones = []
  const usuario = user === undefined ? null : user ?? { estado: 'ACTIVO', roles: [
    { rol: { nombre: 'Técnico agropecuario', permisos: [
      { permiso: { codigo: 'PANTALLA_VISITAS_AGENDA' } },
      { permiso: { codigo: 'VISITAS_READ' } },
    ] } },
  ] }
  const tx = {
    $queryRaw: async () => aviso.estado === 'PENDIENTE' ? [{ id: 15 }] : [],
    avisoSeguimiento: {
      findUniqueOrThrow: async () => ({ ...aviso }),
      update: async ({data}) => { const intentos = aviso.intentos; Object.assign(aviso,data); if (data.intentos?.increment) aviso.intentos = intentos + 1 },
    },
    seguimientoVisita: { findUnique: async () => seg === undefined ? null :
      ({ ...seguimiento(), ...(seg ?? {}), fechaLimite: vencimientoHistorico }) },
    usuario: { findUnique: async () => usuario },
    notificacion: { createMany: async ({data}) => {
      if (fail) throw new Error('Fallo transitorio')
      notificaciones.push(...data.filter(n => !notificaciones.some(prev => prev.claveEvento === n.claveEvento)))
      return { count: 1 }
    } },
  }
  const db = {
    $transaction: async (cb) => cb(tx),
    avisoSeguimiento: {
      findUnique: async () => ({ intentos: aviso.intentos, estado: aviso.estado }),
      updateMany: async ({ data }) => {
        aviso.intentos += data.intentos.increment
        aviso.estado = data.estado
        aviso.proximoIntento = data.proximoIntento
        aviso.ultimoError = data.ultimoError
        return { count: 1 }
      },
    },
  }
  return { db, aviso, notificaciones }
}

test('08:00 Guatemala: aviso próximo un día antes y vencido el siguiente', () => {
  assert.equal(calcularFechaAviso('2026-10-24','PROXIMO').toISOString(), '2026-10-23T14:00:00.000Z')
  assert.equal(calcularFechaAviso('2026-10-24','VENCIDO').toISOString(), '2026-10-25T14:00:00.000Z')
  assert.equal(fechaLocalGuatemala(new Date('2026-10-24T03:59:59Z')), '2026-10-23')
  assert.equal(fechaLocalGuatemala(new Date('2026-10-24T06:00:00Z')), '2026-10-24')
  assert.equal(debeEmitirAviso('PROXIMO','2026-10-24',new Date('2026-10-23T20:00:00Z')), true)
  assert.equal(debeEmitirAviso('PROXIMO','2026-10-24',new Date('2026-10-24T20:00:00Z')), false)
  assert.equal(debeEmitirAviso('VENCIDO','2026-10-24',new Date('2026-10-24T20:00:00Z')), false)
  assert.equal(debeEmitirAviso('VENCIDO','2026-10-24',new Date('2026-10-25T20:00:00Z')), true)
})

test('permiso de agenda y de API de visitas, sin roles, es insuficiente', () => {
  assert.equal(puedeRecibirAvisosSeguimiento([{nombre:'Técnico',permisos:[{permiso:{codigo:'PANTALLA_VISITAS_AGENDA'}}]}]),false)
  assert.equal(puedeRecibirAvisosSeguimiento([{nombre:'Técnico',permisos:[{permiso:{codigo:'PANTALLA_VISITAS_AGENDA'}},{permiso:{codigo:'VISITAS_READ'}}]}]),true)
  assert.equal(puedeRecibirAvisosSeguimiento([{nombre:'Dirección general',permisos:[]}]),true)
  assert.equal(puedeRecibirAvisosSeguimiento([{nombre:'Coordinadora del Programa Agroforestal',permisos:[]}]),true)
})

test('mensajes distinguen tarea ONG y seguimiento de familia y enlazan UUID', () => {
  const a = descripcionAvisoSeguimiento('VENCIDO',{id:seguimiento().id,texto:'Regar huerto',responsable:'Familia',familia:'Familia A',fechaLimite:'2026-10-24'})
  assert.equal(a.tipo,'COMPROMISO_VENCIDO')
  assert.match(a.mensaje,/Verificar con la familia/)
  assert.equal(a.referencia, `/visitas/agenda?seguimiento=${seguimiento().id}`)
})

test('creación idempotente de avisos y reconciliación no reinicia intentos', async () => {
  const {tx, avisos} = scheduler()
  const now = new Date('2026-10-22T14:00:00Z')
  await service.sincronizarAvisosSeguimiento(tx,[seguimiento().id],now)
  assert.equal(avisos.length,2)
  avisos[0].intentos = 3
  await service.sincronizarAvisosSeguimiento(tx,[seguimiento().id],now,false)
  assert.equal(avisos.length,2)
  assert.equal(avisos[0].intentos,3)
  assert.deepEqual(new Set(avisos.map(a => a.tipo)),new Set(['PROXIMO','VENCIDO']))
})

test('cerrar compromiso cancela futuros avisos y conserva enviados', async () => {
  const {tx, avisos, rows} = scheduler()
  await service.sincronizarAvisosSeguimiento(tx,[seguimiento().id],new Date('2026-10-22T14:00:00Z'))
  const enviado = avisos.find(a => a.tipo === 'PROXIMO')
  enviado.estado = 'ENVIADO'
  rows[0].estado = 'CUMPLIDO'
  await service.sincronizarAvisosSeguimiento(tx,[seguimiento().id])
  assert.equal(enviado.estado,'ENVIADO')
  assert.equal(avisos.find(a => a.tipo === 'VENCIDO').estado,'CANCELADO')
})

test('reprogramación cancela avisos de fecha anterior y crea nueva fecha, sin duplicar', async () => {
  const {tx, avisos, rows} = scheduler()
  await service.sincronizarAvisosSeguimiento(tx,[seguimiento().id],new Date('2026-10-22T14:00:00Z'))
  rows[0].fechaLimite = new Date('2026-11-15T12:00:00Z')
  await service.sincronizarAvisosSeguimiento(tx,[seguimiento().id],new Date('2026-10-22T14:00:00Z'))
  assert.equal(avisos.filter(a => a.estado === 'PENDIENTE').length,2)
  assert.equal(avisos.filter(a => a.estado === 'CANCELADO').length,2)
})

test('solo un aviso VENCIDO se envía y se registra como ENVIADO', async () => {
  // Fecha límite posterior al día actual de la prueba: construir vencido histórico inyectando fila.
  const f = workerDB({tipo:'VENCIDO'})
  assert.equal(await worker.procesarUnAvisoSeguimiento(f.db),'ENVIADO')
  assert.equal(f.notificaciones.length,1)
  assert.equal(f.notificaciones[0].tipo,'COMPROMISO_VENCIDO')
  assert.equal(f.notificaciones[0].claveEvento,'SEG:15')
  assert.equal(f.aviso.estado,'ENVIADO')
  assert.equal(await worker.procesarUnAvisoSeguimiento(f.db),'VACIO')
})

test('un compromiso completado, sin permiso o de otro usuario se cancela', async () => {
  for (const changes of [{ seg: seguimiento('CUMPLIDO') },
    {user:{estado:'ACTIVO',roles:[]}},
    {seg:{...seguimiento(),visitaOrigen:{...visita,usuarioResponsableId:99}}}]) {
    const f = workerDB(changes)
    assert.equal(await worker.procesarUnAvisoSeguimiento(f.db),'CANCELADO')
    assert.equal(f.aviso.estado,'CANCELADO')
    assert.equal(f.notificaciones.length,0)
  }
})

test('error al insertar una notificación registra intento con próxima ejecución', async () => {
  const f = workerDB({fail:true})
  await assert.rejects(worker.procesarUnAvisoSeguimiento(f.db),/Fallo transitorio/)
  assert.equal(f.aviso.intentos,1)
  assert.equal(f.aviso.estado,'PENDIENTE')
  assert.match(f.aviso.ultimoError,/Fallo transitorio/)
})
