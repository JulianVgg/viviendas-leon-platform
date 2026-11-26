import { getPrismaClient } from '../../config/prisma.js'
import type { AuthenticatedUser } from '../auth/auth.service.js'
import { esDireccionGeneral } from '../auth/require-permission.middleware.js'
import { FIN_TYPES } from '../finance/finance.rules.js'
import { fechaHoyGuatemala } from '../visits/visit-schedule.rules.js'
export async function contextoOperativo(usuario: AuthenticatedUser, meses: number) {
  const db = getPrismaClient()
  const direccion = esDireccionGeneral(usuario.roles)
  const puede = (...permisos: string[]) => direccion || permisos.some(p => usuario.permisos.includes(p))
  const hoy = fechaHoyGuatemala()
  const inicio = new Date(`${hoy.slice(0,7)}-01T12:00:00Z`); inicio.setUTCMonth(inicio.getUTCMonth() - meses + 1)
  const fin = new Date(`${hoy}T23:59:59Z`)
  const tiposFinanzas = Object.values(FIN_TYPES).filter(t => puede('PANTALLA_CONTROL_FINANCIERO') && puede(t.permission)).map(t => t.code)
  const [visitas, huertos, familias, compromisos, usuarios, finanzas] = await Promise.all([
    db.visita.findMany({ where: { estado: 'PROGRAMADA' }, select: { id: true, familiaId: true, usuarioResponsableId: true, fecha: true, estado: true }, orderBy: [{ fecha: 'asc' }, { id: 'asc' }], take: 100 }),
    puede('PANTALLA_HUERTOS','HUERTOS_READ','PANTALLA_HUERTOS_LISTA') ? db.huerto.findMany({ select: { id: true, familiaId: true, estado: true, entornoCultivo: true, modalidadesProductivas: true }, orderBy: { id: 'asc' }, take: 100 }) : [],
    db.familia.findMany({ select: { id: true, estado: true, comunidadId: true }, orderBy: { id: 'asc' }, take: 100 }),
    db.seguimientoVisita.findMany({ where: { estado: 'PENDIENTE' }, select: { id: true, visitaOrigenId: true, fechaLimite: true, estado: true, visitaOrigen: { select: { familiaId: true, usuarioResponsableId: true } } }, orderBy: [{ fechaLimite: 'asc' }, { id: 'asc' }], take: 100 }),
    db.usuario.findMany({ where: { estado: 'ACTIVO' }, select: { id: true, roles: { where: { rol: { activo: true } }, select: { rol: { select: { nombre: true, permisos: { select: { permiso: { select: { codigo: true } } } } } } } } }, orderBy: { id: 'asc' }, take: 100 }),
    tiposFinanzas.length ? db.finMovimiento.groupBy({ by: ['tipo'], where: { anuladoEn: null, trasladoId: null, fecha: { gte: inicio, lte: fin }, cuenta: { tipo: { in: tiposFinanzas } } }, _sum: { importe: true }, _count: true }) : [],
  ])
  return { hoyGuatemala: hoy, periodoFinanzas: { desde: inicio.toISOString().slice(0,10), hasta: hoy, moneda: 'GTQ' }, finanzasAutorizadas: tiposFinanzas.length > 0, finanzas: finanzas.map(f => ({ tipo:f.tipo, importe:f._sum.importe?.toString(), cantidad:f._count })), visitas, huertos, familias,
    compromisos: compromisos.map(c => ({ ...c, editable: c.visitaOrigen.usuarioResponsableId === usuario.id && puede('VISITAS_WRITE','SYN-VISITAS-WRITE') })),
    tecnicos: usuarios.filter(u => !esDireccionGeneral(u.roles.map(r=>r.rol.nombre)) && !u.roles.some(r=>/coordin/i.test(r.rol.nombre)) && u.roles.some(r=>r.rol.permisos.some(p=>['VISITAS_WRITE','SYN-VISITAS-WRITE'].includes(p.permiso.codigo)))).map(u=>({ id:u.id })),
    participantes: usuarios.filter(u=>u.roles.length > 0 && !u.roles.some(r=>r.rol.nombre.trim().toLowerCase()==='contador')).map(u=>({id:u.id})),
    aviso: 'Listados limitados a 100 registros por módulo; no son totales. No contienen nombres ni información de expedientes.' }
}
