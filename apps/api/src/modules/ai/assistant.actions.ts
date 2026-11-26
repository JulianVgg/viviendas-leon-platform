import { validDay } from '../finance/finance.rules.js'
import type { contextoOperativo } from './assistant.context.js'
import { puedeExportarReporteAgricola } from '../reports/semester.access.js'
import { esDireccionGeneral } from '../auth/require-permission.middleware.js'
import { puedeEditarPerfilCompleto } from '../profile/profile.permissions.js'
import type { AuthenticatedUser } from '../auth/auth.service.js'
export type AccionIA =
  | { tipo: 'agendar_visita'; familiaId: number; responsableId: number; fecha: string; turno: 'MANANA' | 'TARDE' }
  | { tipo: 'reprogramar_visita'; visitaId: number; fecha: string; motivo: string }
  | { tipo: 'reporte_semestral'; anio: number; semestre: 1 | 2 }
  | { tipo: 'actualizar_compromiso'; compromisoId: string; estado: 'CUMPLIDO' | 'NO_CUMPLIDO' }
  | { tipo: 'crear_evento'; titulo: string; fecha: string; inicio: string; fin: string; participantesIds: number[] }
const id = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x > 0 && x <= 2147483647
const texto = (x: unknown, max: number): x is string => typeof x === 'string' && !!x.trim() && x.length <= max
const hora = (x: unknown): x is string => typeof x === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(x)
export function validarAccionIA(raw: unknown, contexto: Awaited<ReturnType<typeof contextoOperativo>>, usuario: AuthenticatedUser): AccionIA | null {
  if (!puedeEditarPerfilCompleto(usuario.roles)) return null
  if (typeof raw !== 'string' || !raw || raw.length > 2500) return null
  let a: Record<string, unknown>
  try { const v: unknown = JSON.parse(raw); if (!v || typeof v !== 'object' || Array.isArray(v)) return null; a = v as Record<string, unknown> } catch { return null }
  const keys = (...k: string[]) => Object.keys(a).length === k.length + 1 && k.every(x => Object.hasOwn(a,x))
  const fecha = validDay(a.fecha) && a.fecha >= contexto.hoyGuatemala
  if (a.tipo === 'agendar_visita' && keys('familiaId','responsableId','fecha','turno') && id(a.familiaId) && id(a.responsableId) && fecha &&
    contexto.familias.some(f => f.id === a.familiaId && ['ACTIVO','ACTIVA'].includes(f.estado.toUpperCase())) && contexto.tecnicos.some(t => t.id === a.responsableId) && ['MANANA','TARDE'].includes(String(a.turno))) return a as AccionIA
  if (a.tipo === 'reprogramar_visita' && keys('visitaId','fecha','motivo') && id(a.visitaId) && fecha && texto(a.motivo,500) && contexto.visitas.some(v=>v.id===a.visitaId)) return a as AccionIA
  if (a.tipo === 'reporte_semestral' && keys('anio','semestre') && id(a.anio) && a.anio>=2000 && a.anio<=2099 && (a.semestre===1 || a.semestre===2) && puedeExportarReporteAgricola(usuario.roles) && (esDireccionGeneral(usuario.roles) || usuario.permisos.includes('PANTALLA_REPORTES_LISTA'))) return a as AccionIA
  if (a.tipo === 'actualizar_compromiso' && keys('compromisoId','estado') && typeof a.compromisoId==='string' && ['CUMPLIDO','NO_CUMPLIDO'].includes(String(a.estado)) && contexto.compromisos.some(c=>c.id===a.compromisoId && c.editable)) return a as AccionIA
  if (a.tipo === 'crear_evento' && keys('titulo','fecha','inicio','fin','participantesIds') && texto(a.titulo,160) && fecha && hora(a.inicio) && hora(a.fin) && a.inicio<a.fin && Array.isArray(a.participantesIds) && a.participantesIds.length<=30 && new Set(a.participantesIds).size===a.participantesIds.length && a.participantesIds.every(p=>id(p)&&contexto.participantes.some(t=>t.id===p))) return a as AccionIA
  return null
}
