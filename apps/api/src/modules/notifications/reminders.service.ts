import { Prisma } from '../../generated/prisma/client.js'
import { getPrismaClient } from '../../config/prisma.js'

import { parsePreferencias, parseReglas, fechaProgramada, type ReglaRecordatorio, type OpcionDia, type TipoOrigen } from './reminders.rules.js'
export { OPCIONES_DIA, DEFAULT_RECORDATORIOS, parsePreferencias, parseReglas, fechaProgramada, reglasTrasCambioFecha } from './reminders.rules.js'
export type { ReglaRecordatorio, OpcionDia, TipoOrigen } from './reminders.rules.js'
type ClienteRecordatorio = Prisma.TransactionClient

function parseStored(raw: unknown, fecha: string): ReglaRecordatorio[] | null {
  const value = parseReglas(raw, fecha)
  return value === undefined ? null : value
}

// Leer preferencias siempre desde BD; no confiar en el usuario del body.
async function reglasParaUsuario(tx: ClienteRecordatorio, usuarioId: number, config: ReglaRecordatorio[] | null) {
  if (config !== null) return config
  const pref = await tx.preferenciaRecordatorio.findUnique({ where: { usuarioId }, select: { anticipaciones: true } })
  return (parsePreferencias(pref?.anticipaciones ?? ['DIA_ANTES']) ?? ['DIA_ANTES']).map(tipo => ({ tipo })) as ReglaRecordatorio[]
}

/** Reemplaza SOLO avisos pendientes del origen; respeta los avisos ya enviados. Debe ejecutarse en la misma transacción que la actividad. */
export async function actualizarRecordatorios(
  tx: ClienteRecordatorio, origen: TipoOrigen, origenId: number, fecha: string,
  destinatarios: number[], configuracion: ReglaRecordatorio[] | null,
): Promise<void> {
  await tx.recordatorio.updateMany({ where: { tipoOrigen: origen, origenId, estado: 'PENDIENTE' }, data: { estado: 'CANCELADO' } })
  if (!destinatarios.length) return
  const personas = await tx.usuario.findMany({
    where: { id: { in: destinatarios }, estado: 'ACTIVO' },
    select: {
      id: true,
      roles: {
        where: { rol: { activo: true } },
        select: { rol: { select: {
          nombre: true,
          permisos: { select: { permiso: { select: { codigo: true } } } },
        } } },
      },
    },
  })
  const permisoDestino = origen === 'CALENDARIO' ? 'PANTALLA_CALENDARIO' : 'PANTALLA_VISITAS_AGENDA'
  const autorizados = new Set(personas.filter(persona => persona.roles.some(relacion => {
    const nombre = relacion.rol.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
    return nombre === 'direccion general' || relacion.rol.permisos.some(p => p.permiso.codigo === permisoDestino)
  })).map(persona => persona.id))
  const ahora = Date.now()
  for (const usuarioId of [...new Set(destinatarios)].filter(id => autorizados.has(id))) {
    const reglas = await reglasParaUsuario(tx, usuarioId, configuracion)
    for (const regla of reglas) {
      const programada = fechaProgramada(fecha, regla)
      if (!Number.isFinite(programada.getTime()) || programada.getTime() <= ahora) continue
      // La fecha forma parte de la clave: una reprogramación después de un aviso ENVIADO
      // nunca reactiva el aviso anterior ni impide crear el aviso para la nueva fecha.
      const clave = regla.tipo === 'PERSONALIZADO' ? `PERSONALIZADO:${regla.fechaHora}` : `${regla.tipo}:${fecha}`
      const existente = await tx.recordatorio.findUnique({ where: { tipoOrigen_origenId_usuarioId_clave: { tipoOrigen: origen, origenId, usuarioId, clave } }, select: { estado: true } })
      if (existente?.estado === 'ENVIADO') continue
      await tx.recordatorio.upsert({
        where: { tipoOrigen_origenId_usuarioId_clave: { tipoOrigen: origen, origenId, usuarioId, clave } },
        create: { tipoOrigen: origen, origenId, usuarioId, clave, fechaProgramada: programada, estado: 'PENDIENTE' },
        update: { fechaProgramada: programada, estado: 'PENDIENTE' },
      })
    }
  }
}

export async function cancelarRecordatorios(tx: ClienteRecordatorio, origen: TipoOrigen, origenId: number) {
  await tx.recordatorio.updateMany({ where: { tipoOrigen: origen, origenId, estado: 'PENDIENTE' }, data: { estado: 'CANCELADO' } })
}

export function configGuardada(raw: Prisma.JsonValue | null, fecha: string) {
  return parseStored(raw, fecha)
}
export function configParaPrisma(config: ReglaRecordatorio[] | null) {
  return config === null ? Prisma.DbNull : config as Prisma.InputJsonValue
}

export async function consultarPreferencias(usuarioId: number) {
  const found = await getPrismaClient().preferenciaRecordatorio.findUnique({ where: { usuarioId }, select: { anticipaciones: true } })
  return { anticipaciones: parsePreferencias(found?.anticipaciones ?? ['DIA_ANTES']) ?? ['DIA_ANTES'] }
}

export async function guardarPreferencias(usuarioId: number, anticipaciones: OpcionDia[]) {
  await getPrismaClient().preferenciaRecordatorio.upsert({
    where: { usuarioId }, create: { usuarioId, anticipaciones }, update: { anticipaciones },
  })
  return { anticipaciones }
}
