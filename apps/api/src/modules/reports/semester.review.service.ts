import { getPrismaClient } from '../../config/prisma.js'
import type { AuthenticatedUser } from '../auth/auth.service.js'
import type { FiltrosSemestrales } from './semester.rules.js'
import { obtenerProduccionSemestral } from './semester.service.js'
import { claveInforme, estadoEfectivo, huellaInforme, puedeAprobarContenido,
  puedeRevisar, puedeValidar, validarComentario, type InformeBase } from './semester.review.rules.js'

export class ErrorRevision extends Error {
  constructor(message: string, readonly status = 409) { super(message) }
}

const usuarioSelect = { id: true, nombre: true, apellido: true } as const
const nombre = (u: { nombre: string; apellido: string | null } | null) =>
  u ? [u.nombre, u.apellido].filter(Boolean).join(' ') : null
const iso = (v: Date | null) => v?.toISOString() ?? null

type RevisionDb = Awaited<ReturnType<typeof obtenerRevisionDb>>
async function obtenerRevisionDb(clave: string) {
  return getPrismaClient().reporteSemestralRevision.findUnique({
    where: { clave },
    include: { revisadoPor: { select: usuarioSelect }, validadoPor: { select: usuarioSelect },
      eventos: { orderBy: { registradoEn: 'desc' }, take: 8,
        include: { usuario: { select: usuarioSelect } } } },
  })
}

function salida(informe: InformeBase, revision: RevisionDb, actor: AuthenticatedUser) {
  const huella = huellaInforme(informe)
  const estado = estadoEfectivo(revision?.estado ?? null, revision?.huella ?? null, huella)
  return { ...informe, estadoValidacion: estado, revision: {
    estado,
    huella,
    comentario: revision?.comentario ?? null,
    revisadoPor: nombre(revision?.revisadoPor ?? null),
    revisadoEn: iso(revision?.revisadoEn ?? null),
    validadoPor: nombre(revision?.validadoPor ?? null),
    validadoEn: iso(revision?.validadoEn ?? null),
    canReview: puedeRevisar(actor),
    canApprove: puedeValidar(actor),
    puedeAprobarContenido: puedeAprobarContenido(informe),
    historial: (revision?.eventos ?? []).map((e: { accion: string; usuario: { nombre: string; apellido: string | null }; registradoEn: Date; comentario: string | null }) => ({ accion: e.accion, usuario: nombre(e.usuario),
      fecha: e.registradoEn.toISOString(), comentario: e.comentario })),
  } }
}

export async function consultarReporteConRevision(filtros: FiltrosSemestrales, actor: AuthenticatedUser) {
  const informe = await obtenerProduccionSemestral(filtros)
  const registro = await obtenerRevisionDb(claveInforme(filtros))
  return salida(informe, registro, actor)
}

export async function cambiarRevision(
  filtros: FiltrosSemestrales, actor: AuthenticatedUser, accion: 'REVISAR' | 'VALIDAR',
  cuerpo: { comentario?: unknown; huella?: unknown },
) {
  if (accion === 'REVISAR' && !puedeRevisar(actor)) throw new ErrorRevision('Sin permiso para revisar.', 403)
  if (accion === 'VALIDAR' && !puedeValidar(actor)) throw new ErrorRevision('Sin permiso para aprobar.', 403)
  const comentario = validarComentario(cuerpo?.comentario)
  const informe = await obtenerProduccionSemestral(filtros)
  const huella = huellaInforme(informe)
  if (typeof cuerpo?.huella !== 'string' || cuerpo.huella !== huella) {
    throw new ErrorRevision('El informe cambió. Actualízalo antes de continuar.')
  }
  const clave = claveInforme(filtros)
  const db = getPrismaClient()
  const ahora = new Date()
  await db.$transaction(async tx => {
    const anterior = await tx.reporteSemestralRevision.findUnique({ where: { clave } })
    const efectivo = estadoEfectivo(anterior?.estado ?? null, anterior?.huella ?? null, huella)

    if (accion === 'VALIDAR') {
      if (efectivo !== 'EN_REVISION' || anterior?.huella !== huella) {
        throw new ErrorRevision('Primero se debe revisar esta versión del informe.')
      }
      if (!puedeAprobarContenido(informe)) {
        throw new ErrorRevision('Existen datos que requieren revisión antes de validar.')
      }
    }
    if (accion === 'REVISAR' && efectivo === 'VALIDADO') {
      throw new ErrorRevision('El informe ya está validado y no presenta cambios.')
    }
    const datos = accion === 'REVISAR'
      ? { estado: 'EN_REVISION', huella, comentario,
          revisadoPorId: actor.id, revisadoEn: ahora, validadoPorId: null, validadoEn: null }
      : { estado: 'VALIDADO', huella, comentario: comentario ?? anterior?.comentario ?? null,
          validadoPorId: actor.id, validadoEn: ahora }

    const registro = anterior
      ? await tx.reporteSemestralRevision.update({ where: { clave }, data: datos })
      : await tx.reporteSemestralRevision.create({ data: {
          clave, anio: filtros.anio, semestre: filtros.semestre,
          comunidadId: filtros.comunidadId ?? null, familiaId: filtros.familiaId ?? null,
          ...datos,
        } })

    await tx.reporteSemestralEvento.create({ data: {
      revisionId: registro.id, usuarioId: actor.id,
      accion: accion === 'VALIDAR' ? 'VALIDACION' : efectivo === 'CAMBIOS_POSTERIORES' ? 'REAPERTURA' : 'REVISION',
      huella, comentario,
    } })
  })
  return salida(informe, await obtenerRevisionDb(clave), actor)
}
