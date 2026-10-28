import { createHash } from 'node:crypto'
import { getPrismaClient } from '../../config/prisma.js'

type DatosPush = {
  endpoint: string
  p256dh: string
  auth: string
  navegador: string | null
}

const hostsPermitidos = new Set([
  'fcm.googleapis.com',
  'fcm-xm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
])

function esEndpointConfiable(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    const host = url.hostname.toLowerCase()
    const hostPermitido = hostsPermitidos.has(host) || host.endsWith('.notify.windows.com')
    return url.protocol === 'https:' && hostPermitido &&
      !url.username && !url.password && !url.port && !url.hash &&
      url.pathname.length > 1
  } catch {
    return false
  }
}

function esClaveBase64Url(valor: unknown, longitudBytes: number): valor is string {
  if (typeof valor !== 'string' || valor.length < 10 || valor.length > 200 ||
    !/^[A-Za-z0-9_-]+$/.test(valor)) return false
  const bytes = Buffer.from(valor, 'base64url')
  return bytes.length === longitudBytes && bytes.toString('base64url') === valor &&
    (longitudBytes !== 65 || bytes[0] === 4)
}

/** Valida datos de PushSubscription.toJSON() sin aceptar destinos arbitrarios. */
export function validarSuscripcionPush(input: unknown): DatosPush | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const cuerpo = input as Record<string, unknown>
  const subscription = cuerpo.subscription
  if (!subscription || typeof subscription !== 'object' || Array.isArray(subscription)) return null
  const datos = subscription as Record<string, unknown>
  const keys = datos.keys
  if (typeof datos.endpoint !== 'string' || datos.endpoint.length > 4096 ||
    !esEndpointConfiable(datos.endpoint) || !keys || typeof keys !== 'object' ||
    Array.isArray(keys)) return null
  const claves = keys as Record<string, unknown>
  if (!esClaveBase64Url(claves.p256dh, 65) || !esClaveBase64Url(claves.auth, 16)) return null
  if (cuerpo.navegador !== undefined &&
    (typeof cuerpo.navegador !== 'string' || cuerpo.navegador.length > 120)) return null

  return {
    endpoint: datos.endpoint,
    p256dh: claves.p256dh,
    auth: claves.auth,
    navegador: typeof cuerpo.navegador === 'string' ? cuerpo.navegador.trim() || null : null,
  }
}

// No devolver endpoints ni las claves de cifrado en las respuestas.
const camposPublicos = {
  id: true,
  endpointHash: true,
  navegador: true,
  fechaCreacion: true,
  fechaActualizacion: true,
} as const

export async function listarSuscripcionesPush(usuarioId: number) {
  return getPrismaClient().suscripcionPush.findMany({
    where: { usuarioId },
    select: camposPublicos,
    orderBy: { fechaCreacion: 'desc' },
  })
}

export async function registrarSuscripcionPush(usuarioId: number, datos: DatosPush) {
  const prisma = getPrismaClient()
  const endpointHash = createHash('sha256').update(datos.endpoint).digest('hex')
  const existente = await prisma.suscripcionPush.findUnique({
    where: { endpointHash },
    select: { id: true, usuarioId: true },
  })

  // Una suscripción de otra cuenta nunca se reasigna silenciosamente.
  if (existente && existente.usuarioId !== usuarioId) {
    return { estado: 'conflicto' as const }
  }

  if (existente) {
    const actualizado = await prisma.suscripcionPush.updateMany({
      where: { id: existente.id, usuarioId },
      data: { claveP256dh: datos.p256dh, claveAuth: datos.auth, navegador: datos.navegador },
    })
    if (actualizado.count === 0) return { estado: 'conflicto' as const }
    const dispositivo = await prisma.suscripcionPush.findFirst({
      where: { id: existente.id, usuarioId },
      select: camposPublicos,
    })
    if (!dispositivo) return { estado: 'conflicto' as const }
    return { estado: 'ok' as const, dispositivo }
  }

  const cantidad = await prisma.suscripcionPush.count({ where: { usuarioId } })
  if (cantidad >= 20) return { estado: 'limite' as const }

  try {
    const dispositivo = await prisma.suscripcionPush.create({
      data: {
        usuarioId,
        endpoint: datos.endpoint,
        endpointHash,
        claveP256dh: datos.p256dh,
        claveAuth: datos.auth,
        navegador: datos.navegador,
      },
      select: camposPublicos,
    })
    return { estado: 'ok' as const, dispositivo }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { estado: 'conflicto' as const }
    }
    throw error
  }
}

export async function eliminarSuscripcionPush(usuarioId: number, id: number) {
  return getPrismaClient().suscripcionPush.deleteMany({ where: { id, usuarioId } })
}
