/** NTF-07: fechas civiles en Guatemala; @db.Date no debe convertirse con la zona del servidor. */
export type TipoAvisoSeguimiento = 'PROXIMO' | 'VENCIDO'
export const ESTADOS_ABIERTOS = ['PENDIENTE', 'NO_CUMPLIDO'] as const
export const INTERVALO_AVISOS_SEGUIMIENTO_MS = 60_000
export const LOTE_AVISOS_SEGUIMIENTO = 50

export function fechaLocalGuatemala(fecha: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(fecha)
}

export function sumarDias(fecha: string, diferencia: number): string {
  const date = new Date(`${fecha}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + diferencia)
  return date.toISOString().slice(0, 10)
}

/** A las 08:00 locales: 14:00 UTC. Guatemala no utiliza horario de verano. */
export function calcularFechaAviso(fechaLimite: string, tipo: TipoAvisoSeguimiento): Date {
  const dia = sumarDias(fechaLimite, tipo === 'PROXIMO' ? -1 : 1)
  return new Date(`${dia}T14:00:00Z`)
}

export function debeEmitirAviso(tipo: TipoAvisoSeguimiento, fechaLimite: string, ahora: Date): boolean {
  const hoy = fechaLocalGuatemala(ahora)
  return tipo === 'PROXIMO' ? hoy < fechaLimite : hoy > fechaLimite
}

export function descripcionAvisoSeguimiento(tipo: TipoAvisoSeguimiento, seguimiento: {
  id: string; texto: string; responsable: string; fechaLimite: string; familia: string
}) {
  const tarea = seguimiento.responsable === 'Familia' ? 'Verificar con la familia' : 'Tarea de la ONG'
  return {
    tipo: tipo === 'PROXIMO' ? 'COMPROMISO_PROXIMO' : 'COMPROMISO_VENCIDO',
    titulo: tipo === 'PROXIMO' ? 'Compromiso próximo a vencer' : 'Compromiso vencido',
    mensaje: `${tarea}: ${seguimiento.texto.slice(0, 200)} · ${seguimiento.familia}. Fecha límite: ${seguimiento.fechaLimite}.`,
    referencia: `/visitas/agenda?seguimiento=${seguimiento.id}`,
  }
}


export type RolAvisosSeguimiento = { nombre: string; permisos: { permiso: { codigo: string } }[] }
export function puedeRecibirAvisosSeguimiento(roles: RolAvisosSeguimiento[]): boolean {
  const normalizar = (nombre: string) => nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
  if (roles.some(rol => normalizar(rol.nombre) === 'direccion general' ||
    normalizar(rol.nombre) === 'coordinadora del programa agroforestal')) return true
  const permisos = new Set(roles.flatMap(rol => rol.permisos.map(p => p.permiso.codigo)))
  return permisos.has('PANTALLA_VISITAS_AGENDA') &&
    ['VISITAS_READ', 'VISITAS_WRITE', 'SYN-VISITAS-WRITE'].some(p => permisos.has(p))
}
