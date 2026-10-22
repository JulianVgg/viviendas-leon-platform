import type { Prisma } from '../../generated/prisma/client.js'
import { getPrismaClient } from '../../config/prisma.js'
import { calcularFechaAviso, ESTADOS_ABIERTOS, fechaLocalGuatemala, type TipoAvisoSeguimiento } from './followup-alerts.rules.js'

/** Siempre dentro de la misma transacción que modifica el compromiso VIS-04.
 * No reemplaza avisos ya ENVIADOS: se conserva la trazabilidad histórica. */
export async function sincronizarAvisosSeguimiento(tx: Prisma.TransactionClient, ids: string[], ahora = new Date(), reactivar = true) {
  const unicos = [...new Set(ids)]
  if (!unicos.length) return
  const seguimientos = await tx.seguimientoVisita.findMany({
    where: { id: { in: unicos } },
    select: { id: true, estado: true, fechaLimite: true, visitaOrigen: { select: { usuarioResponsableId: true } } },
  })
  const hoy = fechaLocalGuatemala(ahora)
  for (const item of seguimientos) {
    if (!item.fechaLimite || !ESTADOS_ABIERTOS.some(estado => estado === item.estado)) {
      await tx.avisoSeguimiento.updateMany({
        where: { seguimientoId: item.id, estado: 'PENDIENTE' }, data: { estado: 'CANCELADO' },
      })
      continue
    }
    const fechaLimite = item.fechaLimite.toISOString().slice(0, 10)
    const usuarioId = item.visitaOrigen.usuarioResponsableId
    // Cancelar únicamente programaciones OBSOLETAS; conservar los intentos y
    // el backoff de los recordatorios vigentes para no resetearlos cada 10 min.
    await tx.avisoSeguimiento.updateMany({ where: {
      seguimientoId: item.id, estado: 'PENDIENTE',
      OR: [{ fechaLimite: { not: item.fechaLimite } }, { usuarioId: { not: usuarioId } },
        ...(hoy >= fechaLimite ? [{ tipo: 'PROXIMO' }] : [])],
    }, data: { estado: 'CANCELADO' } })
    for (const tipo of ['PROXIMO', 'VENCIDO'] as TipoAvisoSeguimiento[]) {
      // No crear avisos «próximos» de compromisos que ya vencieron.
      if (tipo === 'PROXIMO' && hoy >= fechaLimite) continue
      const existente = await tx.avisoSeguimiento.findUnique({
        where: { seguimientoId_usuarioId_tipo_fechaLimite: {
          seguimientoId: item.id, usuarioId, tipo, fechaLimite: item.fechaLimite,
        } }, select: { estado: true },
      })
      if (existente && (existente.estado === 'ENVIADO' || existente.estado === 'ERROR' ||
        existente.estado === 'PENDIENTE' || (!reactivar && existente.estado === 'CANCELADO'))) continue
      await tx.avisoSeguimiento.upsert({
        where: { seguimientoId_usuarioId_tipo_fechaLimite: {
          seguimientoId: item.id, usuarioId, tipo, fechaLimite: item.fechaLimite,
        } },
        create: { seguimientoId: item.id, usuarioId, tipo, fechaLimite: item.fechaLimite,
          fechaProgramada: calcularFechaAviso(fechaLimite, tipo), estado: 'PENDIENTE' },
        update: { fechaProgramada: calcularFechaAviso(fechaLimite, tipo), estado: 'PENDIENTE',
          intentos: 0, proximoIntento: null, ultimoError: null },
      })
    }
  }
}

/** Recupera compromisos anteriores a NTF-07 y cambios hechos fuera de la API.
 * Se ejecuta al iniciar y periódicamente; cada lote conserva atomicidad. */
export async function reconciliarAvisosSeguimiento() {
  const db = getPrismaClient()
  let cursor: string | undefined
  for (;;) {
    const rows = await db.seguimientoVisita.findMany({
      where: { estado: { in: [...ESTADOS_ABIERTOS] }, fechaLimite: { not: null } },
      select: { id: true }, orderBy: { id: 'asc' }, take: 200,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
    if (!rows.length) return
    await db.$transaction(async tx => {
      await sincronizarAvisosSeguimiento(tx, rows.map(item => item.id), new Date(), false)
    })
    cursor = rows[rows.length - 1].id
    if (rows.length < 200) return
  }
}
