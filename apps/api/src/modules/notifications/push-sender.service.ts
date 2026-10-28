import webpush from 'web-push'
import { getPrismaClient } from '../../config/prisma.js'
import { validarSuscripcionPush } from './push-subscriptions.service.js'

// Se limita la prueba a una solicitud por usuario cada minuto y nunca se permite
// elegir destinatarios ni mensajes desde el cliente.
const ultimasPruebas = new Map<number, number>()
const INTERVALO_MS = 60_000

/** Solo 404 y 410 indican que el servicio push ya no reconoce una suscripción. */
export function esSuscripcionPushCaducada(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('statusCode' in error)) return false
  return error.statusCode === 404 || error.statusCode === 410
}

export async function enviarPruebaPush(usuarioId: number) {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  // URL pública del repositorio como contacto de desarrollo por defecto.
  // En producción es recomendable usar VAPID_SUBJECT con un correo o URL institucional.
  const subject = process.env.VAPID_SUBJECT?.trim() ||
    'https://github.com/JulianVgg/viviendas-leon-platform'

  if (!publicKey || !privateKey || !/^(https:\/\/[^\s]+|mailto:[^\s@]+@[^\s@]+)$/i.test(subject)) {
    return { estado: 'sin_configuracion' as const }
  }

  const ahora = Date.now()
  const anterior = ultimasPruebas.get(usuarioId) ?? 0
  if (ahora - anterior < INTERVALO_MS) {
    return { estado: 'limite' as const, esperaSegundos: Math.ceil((INTERVALO_MS - (ahora - anterior)) / 1000) }
  }

  const prisma = getPrismaClient()
  const suscripciones = await prisma.suscripcionPush.findMany({
    where: { usuarioId },
    select: { id: true, endpoint: true, claveP256dh: true, claveAuth: true },
    take: 20,
  })
  if (suscripciones.length === 0) return { estado: 'sin_dispositivos' as const }

  // Reservar el intervalo antes de iniciar las peticiones para evitar envíos concurrentes.
  ultimasPruebas.set(usuarioId, ahora)
  if (ultimasPruebas.size > 1000) {
    for (const [id, fecha] of ultimasPruebas) {
      if (ahora - fecha > INTERVALO_MS) ultimasPruebas.delete(id)
    }
  }

  const respuestas = await Promise.all(suscripciones.map(async (dispositivo) => {
    const suscripcion = {
      endpoint: dispositivo.endpoint,
      keys: { p256dh: dispositivo.claveP256dh, auth: dispositivo.claveAuth },
    }
    // Validar también al enviar para no contactar destinos inesperados si la BD cambia.
    if (!validarSuscripcionPush({ subscription: suscripcion })) return 'fallida' as const

    try {
      // No se envían títulos, nombres ni datos de actividades a servicios externos.
      // El Service Worker muestra el mensaje genérico al recibir el evento push.
      await webpush.sendNotification(suscripcion, undefined, {
        vapidDetails: { subject, publicKey, privateKey },
        TTL: 60,
        timeout: 10_000,
        urgency: 'normal',
      })
      return 'aceptada' as const
    } catch (error) {
      if (esSuscripcionPushCaducada(error)) {
        // Id y usuario se filtran conjuntamente: jamás se borran suscripciones ajenas.
        await prisma.suscripcionPush.deleteMany({ where: { id: dispositivo.id, usuarioId } })
        return 'caducada' as const
      }
      // No registrar endpoints ni claves en logs.
      const codigo = error && typeof error === 'object' && 'statusCode' in error &&
        typeof error.statusCode === 'number' ? error.statusCode : 'desconocido'
      console.warn('NTF-11: servicio push rechazó una prueba (estado):', codigo)
      return 'fallida' as const
    }
  }))

  return {
    estado: 'procesada' as const,
    intentos: respuestas.length,
    aceptadas: respuestas.filter(r => r === 'aceptada').length,
    fallidas: respuestas.filter(r => r === 'fallida').length,
    caducadas: respuestas.filter(r => r === 'caducada').length,
  }
}
