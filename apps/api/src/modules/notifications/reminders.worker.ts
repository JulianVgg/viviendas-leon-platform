import type { Prisma, PrismaClient } from '../../generated/prisma/client.js'
import { getPrismaClient } from '../../config/prisma.js'
import {
  INTERVALO_REVISION_MS, LOTE_MAXIMO,
  permisoDeOrigen, resultadoFallo, resumenRecordatorio, TIPO_RECORDATORIO,
} from './reminders.worker.rules.js'

/**
 * Todo el despacho se ejecuta en UNA transacción. FOR UPDATE SKIP LOCKED evita
 * que dos instancias tomen el mismo recordatorio. Cancelaciones/reprogramaciones
 * concurrentes esperan el bloqueo y no dejan salir avisos de registros cancelados.
 * La notificación y el estado ENVIADO se confirman atómicamente.
 */
export type ClienteWorker = Pick<PrismaClient, '$transaction' | 'recordatorio'>

export async function procesarUno(prisma: ClienteWorker = getPrismaClient()): Promise<'ENVIADO' | 'CANCELADO' | 'VACIO'> {
  let idEnCurso: number | null = null
  try {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const filas = await tx.$queryRaw<{ id: number }[]>`
        SELECT "id" FROM "recordatorio"
        WHERE "estado" = 'PENDIENTE'
          AND "fecha_programada" <= NOW()
          AND ("proximo_intento" IS NULL OR "proximo_intento" <= NOW())
        ORDER BY "fecha_programada" ASC, "id" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `
      if (!filas.length) return 'VACIO'
      const id = filas[0].id
      idEnCurso = id
      const r = await tx.recordatorio.findUniqueOrThrow({ where: { id } })
      const cancelar = async () => {
        await tx.recordatorio.update({ where: { id }, data: {
          estado: 'CANCELADO', procesadoEn: new Date(), proximoIntento: null,
        } })
        return 'CANCELADO' as const
      }
      // Comprobar el estado real, no confiar únicamente en los destinatarios
      // calculados al programar el recordatorio (podrían haber cambiado).
      const persona = await tx.usuario.findUnique({ where: { id: r.usuarioId }, select: {
        estado: true,
        roles: { where: { rol: { activo: true } }, select: { rol: { select: {
          nombre: true, permisos: { select: { permiso: { select: { codigo: true } } } },
        } } } },
      } })
      if (persona?.estado !== 'ACTIVO') return cancelar()
      const permiso = permisoDeOrigen(r.tipoOrigen)
      const autorizado = persona.roles.some(relacion =>
        relacion.rol.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === 'direccion general' ||
        relacion.rol.permisos.some(p => p.permiso.codigo === permiso),
      )
      if (!autorizado) return cancelar()

      let detalle: ReturnType<typeof resumenRecordatorio> | null = null
      if (r.tipoOrigen === 'CALENDARIO') {
        const evento = await tx.eventoInstitucional.findUnique({ where: { id: r.origenId }, select: {
          titulo: true, fechaInicio: true,
          participantes: { where: { usuarioId: r.usuarioId }, select: { usuarioId: true } },
        } })
        if (evento?.participantes.length) detalle = resumenRecordatorio('CALENDARIO', evento.titulo, evento.fechaInicio)
      } else if (r.tipoOrigen === 'VISITA') {
        const visita = await tx.visita.findUnique({ where: { id: r.origenId }, select: {
          fecha: true, estado: true, usuarioResponsableId: true,
          familia: { select: { nombreReferencia: true } },
        } })
        if (visita && visita.estado === 'PROGRAMADA' && visita.usuarioResponsableId === r.usuarioId) {
          detalle = resumenRecordatorio('VISITA', visita.familia.nombreReferencia, visita.fecha)
        }
      }
      if (!detalle) return cancelar()

      // La clave unique protege frente a reintentos incluso si el proceso muere
      // después de insertar y antes de que se registre el estado (rollback).
      await tx.notificacion.createMany({ data: [{
        usuarioId: r.usuarioId, tipo: TIPO_RECORDATORIO,
        titulo: detalle.titulo, mensaje: detalle.mensaje,
        referencia: detalle.referencia, claveEvento: `REM:${r.id}`,
      }], skipDuplicates: true })
      await tx.recordatorio.update({ where: { id }, data: {
        estado: 'ENVIADO', intentos: { increment: 1 },
        proximoIntento: null, ultimoError: null, procesadoEn: new Date(),
      } })
      return 'ENVIADO'
    }, { timeout: 12_000, maxWait: 3_000 })
  } catch (error) {
    if (idEnCurso !== null) {
      // El UPDATE de diagnóstico es deliberadamente independiente de la
      // transacción que falló. Solo opera si el recordatorio sigue pendiente.
      try {
        const actual = await prisma.recordatorio.findUnique({ where: { id: idEnCurso }, select: {
          estado: true, intentos: true,
        } })
        if (actual?.estado === 'PENDIENTE') {
          const retry = resultadoFallo(actual.intentos, new Date())
          const mensaje = error instanceof Error ? error.message.slice(0, 500) : 'Fallo desconocido'
          await prisma.recordatorio.updateMany({ where: { id: idEnCurso, estado: 'PENDIENTE', intentos: actual.intentos }, data: {
            estado: retry.estado, intentos: { increment: 1 },
            proximoIntento: retry.proximoIntento, ultimoError: mensaje,
          } })
        }
      } catch (errorRegistro) {
        console.error('[NTF-05] No se pudo registrar el reintento:', errorRegistro)
      }
    }
    throw error
  }
}

let ejecutando = false
/** Se ejecuta una vez al arrancar y luego periódicamente, incluso sin usuarios conectados. */
export async function ejecutarLote(prisma: ClienteWorker = getPrismaClient()) {
  if (ejecutando) return
  ejecutando = true
  const resultado = { enviados: 0, cancelados: 0, revisados: 0, fallos: 0 }
  try {
    for (let i = 0; i < LOTE_MAXIMO; i++) {
      try {
        const estado = await procesarUno(prisma)
        if (estado === 'VACIO') break
        resultado.revisados++
        if (estado === 'ENVIADO') resultado.enviados++
        if (estado === 'CANCELADO') resultado.cancelados++
      } catch (error) {
        resultado.fallos++
        console.error('[NTF-05] Fallo procesando recordatorio:', error)
        // Evitar loop cuando la base no está disponible; nuevo intento en próximo ciclo.
        break
      }
    }
    if (resultado.revisados || resultado.fallos) console.info('[NTF-05] Lote:', resultado)
  } finally {
    ejecutando = false
  }
}

export function iniciarProcesadorRecordatorios() {
  if (process.env.NTF_REMINDERS_WORKER_ENABLED === 'false') {
    console.info('[NTF-05] Procesador desactivado por configuración.')
    return () => {}
  }
  const timer = setInterval(() => { void ejecutarLote() }, INTERVALO_REVISION_MS)
  timer.unref()
  void ejecutarLote()
  console.info(`[NTF-05] Procesador iniciado; revisión cada ${INTERVALO_REVISION_MS / 1000} s.`)
  return () => clearInterval(timer)
}
