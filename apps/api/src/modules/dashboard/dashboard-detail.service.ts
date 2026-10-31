import { getPrismaClient } from '../../config/prisma.js'
import type { AuthenticatedUser } from '../auth/auth.service.js'
import { puedeEditarPerfilCompleto } from '../profile/profile.permissions.js'
import { fechaLocalGuatemala, periodoDashboard } from './dashboard-summary.rules.js'
import { filtroFamilia, filtroHuerto, filtroCiclo, filtroVisita, filtroCapacitacion, type FiltrosMon05 } from './mon05-filters.js'

export const TIPOS_DETALLE = ['familias', 'huertos', 'ciclos', 'visitas', 'capacitaciones', 'vencidas'] as const
export type TipoDetalle = typeof TIPOS_DETALLE[number]

// Nunca devuelve datos de otras personas a un usuario operativo.
export async function obtenerDetalleIndicador(
  usuario: AuthenticatedUser, tipo: TipoDetalle, meses: number, pagina: number, limite: number,
  db = getPrismaClient(), ahora = new Date(), filtros: FiltrosMon05 = {},
) {
  const institucional = puedeEditarPerfilCompleto(usuario.roles)
  if (!institucional && ['familias','huertos','ciclos'].includes(tipo)) return null
  const { desde, hoy } = periodoDashboard(ahora, meses)
  const inicio = new Date(`${desde}T00:00:00Z`)
  const fin = new Date(`${hoy}T00:00:00Z`)
  const salto = (pagina-1)*limite
  const camposUsuario = { nombre: true, apellido: true } as const
  const etiquetaUsuario = (u: { nombre: string; apellido: string | null } | null) => u
    ? `${u.nombre} ${u.apellido ?? ''}`.trim() : 'Sin responsable'
  let total = 0
  let registros: Array<{ id: number; titulo: string; subtitulo: string; fecha?: string; estado?: string }> = []
  if (tipo === 'familias') {
    total = await db.familia.count({ where: filtroFamilia(filtros) })
    const filas = await db.familia.findMany({ where: filtroFamilia(filtros), skip: salto, take: limite, orderBy: { id: 'desc' },
      select: { id: true, nombreReferencia: true, estado: true, comunidad: { select: { nombre: true } } } })
    registros = filas.map(v=>({id:v.id,titulo:v.nombreReferencia,subtitulo:v.comunidad.nombre,estado:v.estado}))
  } else if (tipo === 'huertos') {
    const where = { estado: { in: ['ACTIVO', 'Activo', 'activo'] }, ...filtroHuerto(filtros) }
    total = await db.huerto.count({ where })
    const filas = await db.huerto.findMany({ where, skip: salto, take: limite, orderBy: { id: 'desc' },
      select: {id:true,nombre:true,estado:true,familia:{select:{nombreReferencia:true}}}})
    registros = filas.map(v=>({id:v.id,titulo:v.nombre ?? `Huerto #${v.id}`,subtitulo:v.familia.nombreReferencia,estado:v.estado}))
  } else if (tipo === 'ciclos') {
    const where = { estado: { in: ['ACTIVO', 'Activo', 'activo', 'EN_CURSO', 'En curso'] }, ...filtroCiclo(filtros) }
    total = await db.cicloCultivo.count({ where })
    const filas = await db.cicloCultivo.findMany({ where, skip: salto, take: limite, orderBy: { id: 'desc' },
      select: {id:true,estado:true,cultivo:{select:{nombre:true}},huerto:{select:{familia:{select:{nombreReferencia:true}}}}}})
    registros = filas.map(v=>({id:v.id,titulo:v.cultivo.nombre,subtitulo:v.huerto.familia.nombreReferencia,estado:v.estado}))
  } else if (tipo === 'visitas' || tipo === 'vencidas') {
    const where = { ...filtroVisita(institucional ? filtros : {}), ...(!institucional ? { usuarioResponsableId: usuario.id } : {}),
      estado: tipo === 'visitas' ? 'REALIZADA' : 'PROGRAMADA',
      fecha: tipo === 'visitas' ? {gte:inicio,lte:fin} : {gte:inicio,lt:fin} }
    total = await db.visita.count({ where })
    const filas = await db.visita.findMany({ where, skip:salto,take:limite,orderBy:[{fecha:'desc'},{id:'desc'}],
      select:{id:true,fecha:true,estado:true,familia:{select:{nombreReferencia:true,comunidad:{select:{nombre:true}}}},usuarioResponsable:{select:camposUsuario}} })
    registros = filas.map(v=>({id:v.id,titulo:v.familia.nombreReferencia,subtitulo:`${etiquetaUsuario(v.usuarioResponsable)} · ${v.familia.comunidad.nombre}`,fecha:v.fecha.toISOString().slice(0,10),estado:tipo==='vencidas'?'VENCIDA':v.estado}))
  } else if (tipo === 'capacitaciones') {
    const where = { ...filtroCapacitacion(institucional ? filtros : {}), ...(!institucional ? { usuarioResponsableId: usuario.id } : {}), fecha: {gte:inicio,lte:fin} }
    total = await db.capacitacion.count({ where })
    const filas = await db.capacitacion.findMany({where,skip:salto,take:limite,orderBy:[{fecha:'desc'},{id:'desc'}],
      select:{id:true,tema:true,fecha:true,estado:true,facilitadorNombre:true,usuarioResponsable:{select:camposUsuario},comunidad:{select:{nombre:true}}}})
    registros = filas.map(v=>({id:v.id,titulo:v.tema,subtitulo:`${etiquetaUsuario(v.usuarioResponsable) === 'Sin responsable' ? (v.facilitadorNombre ?? 'Sin responsable') : etiquetaUsuario(v.usuarioResponsable)}${v.comunidad ? ` · ${v.comunidad.nombre}` : ''}`,fecha:v.fecha.toISOString().slice(0,10),estado:v.estado}))
  }
  return { tipo, pagina, limite, total, totalPaginas: Math.max(1, Math.ceil(total/limite)), registros, actualizado: fechaLocalGuatemala(ahora) }
}
