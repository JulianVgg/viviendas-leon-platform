import { createHash } from 'node:crypto'
import type { FiltrosSemestrales } from './semester.rules.js'
import type { obtenerProduccionSemestral } from './semester.service.js'

export type InformeBase = Awaited<ReturnType<typeof obtenerProduccionSemestral>>
export type EstadoInforme = 'PRELIMINAR' | 'EN_REVISION' | 'VALIDADO' | 'CAMBIOS_POSTERIORES'
export type UsuarioPermisos = { roles: string[]; permisos: string[] }

const simplificar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
export const esDireccion = (u: UsuarioPermisos) => u.roles.some(r => simplificar(r) === 'direccion general')
export const puedeRevisar = (u: UsuarioPermisos) => esDireccion(u) || u.permisos.includes('REPORTE_SEMESTRAL_REVISAR')
export const puedeValidar = (u: UsuarioPermisos) => esDireccion(u) || u.permisos.includes('REPORTE_SEMESTRAL_VALIDAR')

export const claveInforme = (f: FiltrosSemestrales) =>
  `${f.anio}:S${f.semestre}:C${f.comunidadId ?? 0}:F${f.familiaId ?? 0}`

// Huella reproducible de las filas y los importes que sustentan el informe.
// Nunca depende de la fecha de consulta ni del estado de aprobación.
export const huellaInforme = (informe: InformeBase) => createHash('sha256').update(JSON.stringify({
  filtros: informe.filtros, periodo: informe.periodo, resumen: informe.resumen,
  porCultivo: informe.porCultivo, detalleCosechas: informe.detalleCosechas,
  detalleVentas: informe.detalleVentas, advertencias: informe.advertencias,
})).digest('hex')

export function estadoEfectivo(estado: string | null, huellaGuardada: string | null, huellaActual: string): EstadoInforme {
  if (!estado) return 'PRELIMINAR'
  if (estado === 'VALIDADO' && huellaGuardada !== huellaActual) return 'CAMBIOS_POSTERIORES'
  if (estado === 'EN_REVISION' && huellaGuardada !== huellaActual) return 'PRELIMINAR'
  if (estado === 'VALIDADO') return 'VALIDADO'
  if (estado === 'EN_REVISION') return 'EN_REVISION'
  return 'PRELIMINAR'
}

export function puedeAprobarContenido(informe: InformeBase): boolean {
  return informe.resumen.datosIncompletos === 0 &&
    informe.resumen.posiblesDuplicados === 0 &&
    informe.resumen.excluidasCrucePeriodo === 0 &&
    informe.advertencias.length === 0
}

export function validarComentario(valor: unknown): string | null {
  if (valor == null || valor === '') return null
  if (typeof valor !== 'string' || valor.trim().length > 1000) throw new Error('El comentario debe tener hasta 1000 caracteres.')
  return valor.trim() || null
}
