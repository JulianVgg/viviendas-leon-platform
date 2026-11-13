import { getPrismaClient } from '../../config/prisma.js'
import { AnalysisError } from './analysis.errors.js'

export function limiteEntero(valor: string | undefined, defecto: number, maximo: number) {
  if (valor === undefined || valor === '') return defecto
  const n = Number(valor)
  if (!Number.isSafeInteger(n) || n < 1 || n > maximo) {
    throw new AnalysisError('AI_CONFIG', 503, 'La configuración de límites de IA es inválida.')
  }
  return n
}

export function diaGuatemala(fecha: Date) {
  const trozos = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(fecha)
  const valor = (tipo: string) => trozos.find(x => x.type === tipo)?.value ?? ''
  const dia = `${valor('year')}-${valor('month')}-${valor('day')}`
  const inicio = new Date(`${dia}T06:00:00.000Z`)
  if (!Number.isFinite(inicio.getTime())) throw new Error('Fecha inválida.')
  return { desde: inicio, hasta: new Date(inicio.getTime() + 86_400_000), clave: Number(dia.replace(/-/g, '')) }
}

/**
 * Las fallidas no consumen la cuota diaria de análisis completados; las reservas
 * activas sí se cuentan para impedir sobrepasar el cupo en concurrencia.
 * Una segunda ventana de 15 minutos, que SÍ cuenta intentos fallidos, evita
 * reintentos ilimitados y gastos de API por errores o abuso.
 */
export async function reservarCupoAnalisis(
  usuarioId: number, modelo: string,
  limites: { usuario: number; global: number },
  db = getPrismaClient(), ahora = new Date(),
) {
  const dia = diaGuatemala(ahora)
  return db.$transaction(async tx => {
    // El bloqueo por fecha serializa la consulta y la reserva incluso con varios servidores.
    await tx.$queryRaw`SELECT 1 AS adquirido FROM pg_advisory_xact_lock(${90412}, ${dia.clave})`
    const fecha = { gte: dia.desde, lt: dia.hasta }
    // Una transacción PostgreSQL utiliza un único cliente: consultas secuenciales.
    const computables = { in: ['RESERVADA', 'COMPLETADA'] }
    const total = await tx.analisisIaSolicitud.count({ where: { creadoEn: fecha, estado: computables } })
    const propios = await tx.analisisIaSolicitud.count({ where: { creadoEn: fecha, usuarioId, estado: computables } })
    if (propios >= limites.usuario || total >= limites.global) {
      throw new AnalysisError('AI_DAILY_LIMIT', 429, 'Se alcanzó el límite diario de análisis.')
    }
    const ventana = { gte: new Date(ahora.getTime() - 15 * 60_000) }
    const intentosUsuario = await tx.analisisIaSolicitud.count({ where: { creadoEn: ventana, usuarioId } })
    if (intentosUsuario >= Math.max(6, Math.min(limites.usuario * 2, 15))) {
      throw new AnalysisError('AI_RATE_LIMIT', 429, 'Demasiadas solicitudes recientes. Inténtalo en unos minutos.')
    }
    const intentosGlobales = await tx.analisisIaSolicitud.count({ where: { creadoEn: ventana } })
    if (intentosGlobales >= Math.max(20, Math.min(limites.global * 2, 100))) {
      throw new AnalysisError('AI_RATE_LIMIT', 429, 'El asistente tiene demasiadas solicitudes. Inténtalo en unos minutos.')
    }
    return tx.analisisIaSolicitud.create({ data: { usuarioId, modelo, estado: 'RESERVADA' }, select: { id: true } })
  })
}

export async function finalizarSolicitudAnalisis(
  id: string, estado: 'COMPLETADA' | 'FALLIDA',
  meta: { tokensEntrada?: number; tokensSalida?: number; proveedorId?: string | null } = {},
  db = getPrismaClient(),
) {
  await db.analisisIaSolicitud.update({
    where: { id },
    data: { estado, finalizadoEn: new Date(), tokensEntrada: meta.tokensEntrada ?? null,
      tokensSalida: meta.tokensSalida ?? null, proveedorId: meta.proveedorId ?? null },
  })
}
