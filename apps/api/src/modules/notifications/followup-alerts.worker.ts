import type { Prisma, PrismaClient } from '../../generated/prisma/client.js'
import { getPrismaClient } from '../../config/prisma.js'
import { resultadoFallo } from './reminders.worker.rules.js'
import {
  descripcionAvisoSeguimiento, debeEmitirAviso, ESTADOS_ABIERTOS, puedeRecibirAvisosSeguimiento,
  INTERVALO_AVISOS_SEGUIMIENTO_MS, LOTE_AVISOS_SEGUIMIENTO,
  type TipoAvisoSeguimiento,
} from './followup-alerts.rules.js'
import { reconciliarAvisosSeguimiento } from './followup-alerts.service.js'

export type ClienteAvisos = Pick<PrismaClient, '$transaction' | 'avisoSeguimiento'>

/** NTF-07: lock por fila + notificación + ENVIADO en una transacción.
 * El constraint único de notificacion.clave_evento protege incluso tras reiniciar. */
export async function procesarUnAvisoSeguimiento(prisma: ClienteAvisos = getPrismaClient()): Promise<'ENVIADO' | 'CANCELADO' | 'VACIO'> {
  let idEnCurso: number | null = null
  try {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const filas = await tx.$queryRaw<{ id: number }[]>`
        SELECT "id" FROM "aviso_seguimiento"
        WHERE "estado" = 'PENDIENTE' AND "fecha_programada" <= NOW()
          AND ("proximo_intento" IS NULL OR "proximo_intento" <= NOW())
        ORDER BY "fecha_programada", "id" FOR UPDATE SKIP LOCKED LIMIT 1
      `
      if (!filas.length) return 'VACIO'
      idEnCurso = filas[0].id
      const aviso = await tx.avisoSeguimiento.findUniqueOrThrow({ where: { id: idEnCurso } })
      const cancelar = async () => {
        await tx.avisoSeguimiento.update({ where: { id: aviso.id }, data: {
          estado: 'CANCELADO', procesadoEn: new Date(), proximoIntento: null,
        } })
        return 'CANCELADO' as const
      }
      const [seguimiento, usuario] = await Promise.all([
        tx.seguimientoVisita.findUnique({ where: { id: aviso.seguimientoId }, select: {
          id: true, texto: true, responsable: true, estado: true, fechaLimite: true,
          visitaOrigen: { select: { usuarioResponsableId: true,
            familia: { select: { nombreReferencia: true } },
          } },
        } }),
        tx.usuario.findUnique({ where: { id: aviso.usuarioId }, select: { estado: true,
          roles: { where: { rol: { activo: true } }, select: { rol: { select: {
            nombre: true, permisos: { select: { permiso: { select: { codigo: true } } } },
          } } } },
        } }),
      ])
      if (!seguimiento || !seguimiento.fechaLimite ||
        !ESTADOS_ABIERTOS.some(estado => estado === seguimiento.estado) ||
        seguimiento.visitaOrigen.usuarioResponsableId !== aviso.usuarioId ||
        seguimiento.fechaLimite.getTime() !== aviso.fechaLimite.getTime() ||
        !debeEmitirAviso(aviso.tipo as TipoAvisoSeguimiento, aviso.fechaLimite.toISOString().slice(0, 10), new Date()) ||
        usuario?.estado !== 'ACTIVO') return cancelar()
      const autorizado = puedeRecibirAvisosSeguimiento(usuario.roles.map(r => r.rol))
      if (!autorizado) return cancelar()

      const payload = descripcionAvisoSeguimiento(aviso.tipo as TipoAvisoSeguimiento, {
        id: seguimiento.id, texto: seguimiento.texto, responsable: seguimiento.responsable,
        fechaLimite: aviso.fechaLimite.toISOString().slice(0, 10),
        familia: seguimiento.visitaOrigen.familia.nombreReferencia,
      })
      await tx.notificacion.createMany({ data: [{
        usuarioId: aviso.usuarioId, ...payload, claveEvento: `SEG:${aviso.id}`,
      }], skipDuplicates: true })
      await tx.avisoSeguimiento.update({ where: { id: aviso.id }, data: {
        estado: 'ENVIADO', intentos: { increment: 1 }, procesadoEn: new Date(),
        proximoIntento: null, ultimoError: null,
      } })
      return 'ENVIADO'
    }, { timeout: 12_000, maxWait: 3_000 })
  } catch (error) {
    if (idEnCurso !== null) {
      try {
        const row = await prisma.avisoSeguimiento.findUnique({ where: { id: idEnCurso }, select: { intentos: true, estado: true } })
        if (row?.estado === 'PENDIENTE') {
          const retry = resultadoFallo(row.intentos, new Date())
          const mensaje = error instanceof Error ? error.message.slice(0, 500) : 'Error desconocido'
          await prisma.avisoSeguimiento.updateMany({ where: { id: idEnCurso, intentos: row.intentos, estado: 'PENDIENTE' }, data: {
            estado: retry.estado, intentos: { increment: 1 }, ultimoError: mensaje,
            proximoIntento: retry.proximoIntento,
          } })
        }
      } catch (errorRegistro) { console.error('[NTF-07] No se pudo registrar el reintento:', errorRegistro) }
    }
    throw error
  }
}

let ejecutando = false
let ciclos = 0
export async function ejecutarLoteAvisosSeguimiento(prisma: ClienteAvisos = getPrismaClient(), reconciliar = reconciliarAvisosSeguimiento) {
  if (ejecutando) return
  ejecutando = true
  const resumen = { enviados: 0, cancelados: 0, fallos: 0 }
  try {
    if (ciclos++ % 10 === 0) {
      try { await reconciliar() }
      catch (error) { console.error('[NTF-07] No se pudieron reconciliar compromisos:', error) }
    }
    for (let i = 0; i < LOTE_AVISOS_SEGUIMIENTO; i++) {
      try {
        const resultado = await procesarUnAvisoSeguimiento(prisma)
        if (resultado === 'VACIO') break
        if (resultado === 'ENVIADO') resumen.enviados++
        if (resultado === 'CANCELADO') resumen.cancelados++
      } catch (error) { resumen.fallos++; console.error('[NTF-07] Error procesando aviso:', error); break }
    }
    if (resumen.enviados || resumen.cancelados || resumen.fallos) console.info('[NTF-07] Lote:', resumen)
  } finally { ejecutando = false }
}

export function iniciarProcesadorAvisosSeguimiento() {
  if (process.env.NTF_FOLLOWUP_WORKER_ENABLED === 'false') {
    console.info('[NTF-07] Procesador desactivado por configuración.')
    return () => {}
  }
  const timer = setInterval(() => { void ejecutarLoteAvisosSeguimiento() }, INTERVALO_AVISOS_SEGUIMIENTO_MS)
  timer.unref()
  void ejecutarLoteAvisosSeguimiento()
  console.info(`[NTF-07] Procesador iniciado; revisión cada ${INTERVALO_AVISOS_SEGUIMIENTO_MS / 1000} s.`)
  return () => clearInterval(timer)
}
