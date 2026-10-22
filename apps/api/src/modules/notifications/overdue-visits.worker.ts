import type { Prisma, PrismaClient } from '../../generated/prisma/client.js'
import { getPrismaClient } from '../../config/prisma.js'
import {
  avisoVencimientoVisita, claveAvisoVisitaVencida, esRolSupervisor, hoyEnGuatemala,
  INTERVALO_VISITAS_VENCIDAS_MS, LOTE_VISITAS_VENCIDAS, puedeConsultarVisitas, visitaVencida,
} from './overdue-visits.rules.js'

export type BaseVisitasVencidas = Pick<PrismaClient, 'visita' | '$transaction'>

/** NTF-08: idempotencia por ID, fecha y destinatario (constraint notificacion.clave_evento).
 * Bloqueamos la visita antes de comprobarla: una reprogramación concurrente nunca
 * puede producir una alerta basada en la fecha anterior después del cambio. */
export async function procesarUnaVisitaVencida(db: BaseVisitasVencidas, id: number, ahora: Date): Promise<number> {
  const hoy = hoyEnGuatemala(ahora)
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const bloqueadas = await tx.$queryRaw<{ id: number }[]>`
      SELECT "id" FROM "visita" WHERE "id" = ${id} FOR UPDATE SKIP LOCKED
    `
    if (!bloqueadas.length) return 0
    const visita = await tx.visita.findUnique({ where: { id }, select: {
      id: true, estado: true, fecha: true, usuarioResponsableId: true,
      familia: { select: { nombreReferencia: true } },
    } })
    if (!visita) return 0
    const fecha = visita.fecha.toISOString().slice(0, 10)
    if (!visitaVencida(visita.estado, fecha, hoy)) return 0

    const usuarios = await tx.usuario.findMany({ where: {
      estado: 'ACTIVO', OR: [
        { id: visita.usuarioResponsableId },
        { roles: { some: { rol: { activo: true, nombre: { in: [
          'Dirección general', 'Coordinadora del Programa Agroforestal',
        ] } } } } },
      ],
    }, select: {
      id: true, roles: { where: { rol: { activo: true } }, select: { rol: { select: {
        nombre: true, permisos: { select: { permiso: { select: { codigo: true } } } },
      } } } },
    } })
    const datos = usuarios.filter(u => puedeConsultarVisitas(u.roles.map(r => r.rol))).map(u => ({
      usuarioId: u.id,
      ...avisoVencimientoVisita({ id, fecha, familia: visita.familia.nombreReferencia },
        esRolSupervisor(u.roles.map(r => r.rol.nombre))),
      claveEvento: claveAvisoVisitaVencida(id, fecha, u.id),
    }))
    if (!datos.length) return 0
    const resultado = await tx.notificacion.createMany({ data: datos, skipDuplicates: true })
    return resultado.count
  }, { timeout: 12_000, maxWait: 3_000 })
}

/** Recorre páginas: el límite por página no deja sin revisar visitas antiguas.
 * No enviamos correos ni push: la campana NTF-02 consume la tabla notificacion. */
export async function procesarVisitasVencidas(db: BaseVisitasVencidas = getPrismaClient(), ahora = new Date()) {
  const hoy = hoyEnGuatemala(ahora)
  const limite = new Date(`${hoy}T12:00:00.000Z`)
  let cursor: number | undefined
  const resumen = { revisadas: 0, generadas: 0, errores: 0 }
  for (;;) {
    const filas = await db.visita.findMany({
      where: { estado: 'PROGRAMADA', fecha: { lt: limite } },
      select: { id: true }, orderBy: { id: 'asc' }, take: LOTE_VISITAS_VENCIDAS,
      ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
    })
    if (!filas.length) break
    for (const fila of filas) {
      try { resumen.generadas += await procesarUnaVisitaVencida(db, fila.id, ahora) }
      catch (error) {
        resumen.errores++
        console.error('[NTF-08] Error generando alerta de visita:', fila.id, error)
      }
      resumen.revisadas++
    }
    cursor = filas[filas.length - 1].id
    if (filas.length < LOTE_VISITAS_VENCIDAS) break
  }
  return resumen
}

let ejecutando = false
export async function ejecutarRevisionVisitasVencidas() {
  if (ejecutando) return
  ejecutando = true
  try {
    const resultado = await procesarVisitasVencidas()
    if (resultado.generadas || resultado.errores) console.info('[NTF-08] Revisión:', resultado)
  } catch (error) { console.error('[NTF-08] Falló la revisión de visitas vencidas:', error) }
  finally { ejecutando = false }
}

export function iniciarProcesadorVisitasVencidas() {
  if (process.env.NTF_OVERDUE_VISITS_ENABLED === 'false') {
    console.info('[NTF-08] Procesador desactivado por configuración.')
    return () => {}
  }
  const timer = setInterval(() => { void ejecutarRevisionVisitasVencidas() }, INTERVALO_VISITAS_VENCIDAS_MS)
  timer.unref()
  void ejecutarRevisionVisitasVencidas()
  console.info(`[NTF-08] Procesador iniciado; revisión cada ${INTERVALO_VISITAS_VENCIDAS_MS / 1000} s.`)
  return () => clearInterval(timer)
}

/** Reprogramar, realizar o cancelar una visita retira sus alertas NO LEÍDAS.
 * Conserva las notificaciones leídas como historial; no altera el estado Visita. */
export async function resolverAvisosVisitaVencida(tx: Prisma.TransactionClient, visitaId: number) {
  await tx.notificacion.updateMany({
    where: { claveEvento: { startsWith: `VISV:${visitaId}:` }, fechaLectura: null },
    data: { fechaLectura: new Date() },
  })
}
