import webpush from 'web-push'
import { getPrismaClient } from '../../config/prisma.js'
import { esSuscripcionPushCaducada } from './push-sender.service.js'
import { validarSuscripcionPush } from './push-subscriptions.service.js'
import { destinoSeguroPush, proximoEnvioPermitido } from './push-automatic.rules.js'
import {
  estadoTrasFalloPush, payloadPushMinimo, INTERVALO_PUSH_MS, MAXIMO_ENTREGAS_LOTE,
} from './push-dispatch.rules.js'

const SCAN_DELAY_MS = 20_000
const SCAN_OVERLAP_MS = 10 * 60_000
const PAGINA_ESCANEO = 100
const LIMITE_ESCANEO = 4000

// Solo se consideran avisos creados después de la migración de activación de NTF-12.
// La tabla de control conserva el cursor entre reinicios. Una superposición de 10 minutos
// permite descubrir transacciones que se confirmen un poco más tarde.
export async function prepararEntregasPush() {
  const db = getPrismaClient()
  const control = await db.controlPush.findUnique({ where: { id: 1 } })
  if (!control) throw new Error('Falta aplicar la migración de control push (NTF-12).')
  const hasta = new Date(Date.now() - SCAN_DELAY_MS)
  const desde = new Date(Math.max(control.activadoEn.getTime(),
    (control.ultimoEscaneo?.getTime() ?? control.activadoEn.getTime()) - SCAN_OVERLAP_MS))
  if (hasta <= desde) return 0

  let cursor: number | undefined
  let revisados = 0
  let preparados = 0
  while (revisados < LIMITE_ESCANEO) {
    const rows = await db.notificacion.findMany({
      where: { fechaCreacion: { gte: desde, lte: hasta } },
      select: { id: true, usuarioId: true, fechaCreacion: true },
      orderBy: [{ fechaCreacion: 'asc' }, { id: 'asc' }],
      take: PAGINA_ESCANEO,
      ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
    })
    if (!rows.length) break
    for (const aviso of rows) {
      const dispositivos = await db.suscripcionPush.findMany({
        where: { usuarioId: aviso.usuarioId, fechaCreacion: { lte: aviso.fechaCreacion } },
        select: { id: true, endpointHash: true },
      })
      if (dispositivos.length) {
        const creado = await db.entregaPush.createMany({
          data: dispositivos.map(d => ({ notificacionId: aviso.id, suscripcionId: d.id,
            endpointHash: d.endpointHash, estado: 'PENDIENTE' })),
          skipDuplicates: true,
        })
        preparados += creado.count
      }
    }
    revisados += rows.length
    cursor = rows[rows.length - 1].id
    if (rows.length < PAGINA_ESCANEO) break
  }
  // Avanzar solo después de completar toda la ventana. No perder el resto de un lote grande.
  if (revisados < LIMITE_ESCANEO) {
    await db.controlPush.update({ where: { id: 1 }, data: { ultimoEscaneo: hasta } })
  }
  return preparados
}

/** Reclama una entrega en una transacción corta; jamás envía peticiones HTTP bajo locks. */
async function reclamarEntregaPush() {
  const db = getPrismaClient()
  return db.$transaction(async tx => {
    const filas = await tx.$queryRaw<{ id: number }[]>`
      SELECT "id" FROM "entrega_push"
      WHERE (("estado" = 'PENDIENTE' AND ("proximo_intento" IS NULL OR "proximo_intento" <= NOW()))
        OR ("estado" = 'PROCESANDO' AND "actualizado_en" < NOW() - INTERVAL '3 minutes'))
      ORDER BY "id" FOR UPDATE SKIP LOCKED LIMIT 1
    `
    if (!filas.length) return null
    const id = filas[0].id
    await tx.entregaPush.update({ where: { id }, data: { estado: 'PROCESANDO', proximoIntento: null } })
    return tx.entregaPush.findUniqueOrThrow({ where: { id }, include: {
      notificacion: { select: { id: true, usuarioId: true, referencia: true } },
      suscripcion: { select: { id: true, usuarioId: true, endpointHash: true,
        endpoint: true, claveP256dh: true, claveAuth: true } },
    } })
  }, { timeout: 5000 })
}

export async function procesarUnaEntregaPush(): Promise<'VACIO' | 'ENVIADO' | 'POSPUESTO' | 'CANCELADO' | 'ERROR'> {
  const db = getPrismaClient()
  const fila = await reclamarEntregaPush()
  if (!fila) return 'VACIO'
  const actualizar = (data: { estado: string; proximoIntento?: Date | null;
    ultimoCodigo?: number | null; ultimoError?: string | null; procesadoEn?: Date | null;
    intentos?: { increment: number } }) => db.entregaPush.updateMany({
    where: { id: fila.id, estado: 'PROCESANDO' }, data,
  })
  const dispositivo = fila.suscripcion
  if (!dispositivo || dispositivo.usuarioId !== fila.notificacion.usuarioId ||
    dispositivo.endpointHash !== fila.endpointHash) {
    await actualizar({ estado: 'CANCELADO', procesadoEn: new Date() })
    return 'CANCELADO'
  }
  const [usuario, preferencia] = await Promise.all([
    db.usuario.findUnique({ where: { id: fila.notificacion.usuarioId }, select: { estado: true } }),
    db.preferenciaPush.findUnique({ where: { usuarioId: fila.notificacion.usuarioId } }),
  ])
  if (usuario?.estado !== 'ACTIVO' || preferencia?.habilitadas === false) {
    await actualizar({ estado: 'CANCELADO', procesadoEn: new Date() })
    return 'CANCELADO'
  }
  const ahora = new Date()
  const permitido = proximoEnvioPermitido(ahora, preferencia?.silencioInicio ?? null,
    preferencia?.silencioFin ?? null)
  if (permitido > ahora) {
    await actualizar({ estado: 'PENDIENTE', proximoIntento: permitido })
    return 'POSPUESTO'
  }
  const subscription = { endpoint: dispositivo.endpoint,
    keys: { p256dh: dispositivo.claveP256dh, auth: dispositivo.claveAuth } }
  if (!validarSuscripcionPush({ subscription })) {
    await actualizar({ estado: 'ERROR', ultimoError: 'SUSCRIPCION_INVALIDA', procesadoEn: ahora })
    return 'ERROR'
  }
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.VAPID_SUBJECT?.trim() || 'https://github.com/JulianVgg/viviendas-leon-platform'
  if (!publicKey || !privateKey) {
    await actualizar({ estado: 'PENDIENTE', proximoIntento: new Date(ahora.getTime() + 60_000) })
    return 'POSPUESTO'
  }

  try {
    await webpush.sendNotification(subscription,
      payloadPushMinimo(fila.notificacion.id, destinoSeguroPush(fila.notificacion.referencia)), {
        vapidDetails: { subject, publicKey, privateKey },
        TTL: 6 * 60 * 60, timeout: 10_000, urgency: 'normal',
      })
    await actualizar({ estado: 'ENVIADO', intentos: { increment: 1 },
      ultimoError: null, ultimoCodigo: null, procesadoEn: new Date() })
    return 'ENVIADO'
  } catch (error) {
    const codigo = error && typeof error === 'object' && 'statusCode' in error &&
      typeof error.statusCode === 'number' ? error.statusCode : null
    if (esSuscripcionPushCaducada(error)) {
      await db.suscripcionPush.deleteMany({ where: { id: dispositivo.id, usuarioId: dispositivo.usuarioId } })
      await actualizar({ estado: 'CADUCADA', intentos: { increment: 1 },
        ultimoCodigo: codigo, ultimoError: 'SUSCRIPCION_CADUCADA', procesadoEn: new Date() })
    } else {
      const siguiente = estadoTrasFalloPush(codigo, fila.intentos, new Date())
      await actualizar({ ...siguiente, intentos: { increment: 1 }, ultimoCodigo: codigo,
        ultimoError: 'PROVEEDOR_PUSH', procesadoEn: siguiente.estado === 'ERROR' ? new Date() : null })
    }
    return 'ERROR'
  }
}

let ejecutando = false
export async function ejecutarLotePush() {
  if (ejecutando) return
  ejecutando = true
  try {
    const creados = await prepararEntregasPush()
    if (creados) console.info('[NTF-12] Entregas preparadas:', creados)
    for (let i = 0; i < MAXIMO_ENTREGAS_LOTE; i++) {
      const resultado = await procesarUnaEntregaPush()
      if (resultado === 'VACIO') break
    }
  } catch (error) {
    // Los fallos de Web Push no se propagan a las rutas del calendario ni de visitas.
    console.error('[NTF-12] No se pudo procesar el lote push:',
      error instanceof Error ? error.message : 'Error inesperado')
  } finally { ejecutando = false }
}

export function iniciarProcesadorPush() {
  if (process.env.NTF_PUSH_WORKER_ENABLED === 'false') {
    console.info('[NTF-12] Procesador push desactivado por configuración.')
    return () => {}
  }
  const timer = setInterval(() => { void ejecutarLotePush() }, INTERVALO_PUSH_MS)
  timer.unref()
  void ejecutarLotePush()
  console.info('[NTF-12] Procesador automático push iniciado.')
  return () => clearInterval(timer)
}
