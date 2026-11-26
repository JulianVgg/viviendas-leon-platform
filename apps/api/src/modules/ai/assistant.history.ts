import { randomUUID } from 'node:crypto'
import { getPrismaClient } from '../../config/prisma.js'
import { AnalysisError } from './analysis.errors.js'
import type { MensajeChatIA, RespuestaChatIA } from './analysis.chat.rules.js'
export type IntercambioIA = { pregunta: string; respuesta: string; referencias: string[]; limitaciones: string[] }
export type ConversacionIA = { id: string; titulo: string; intercambios: IntercambioIA[]; version: number; actualizadoEn: Date }
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
function idValido(id: unknown): string {
  if (typeof id !== 'string' || !uuid.test(id)) throw new AnalysisError('INVALID_BODY', 400, 'Conversación inválida.')
  return id
}
export async function listarConversaciones(usuarioId: number) {
  return getPrismaClient().$queryRaw<Omit<ConversacionIA, 'intercambios' | 'version'>[]>`
    SELECT id, titulo, actualizado_en AS "actualizadoEn" FROM ia_conversacion WHERE usuario_id=${usuarioId} ORDER BY actualizado_en DESC LIMIT 100`
}
export async function leerConversacion(usuarioId: number, id: unknown) {
  const filas = await getPrismaClient().$queryRaw<ConversacionIA[]>`
    SELECT id, titulo, intercambios, version, actualizado_en AS "actualizadoEn" FROM ia_conversacion
    WHERE usuario_id=${usuarioId} AND id=CAST(${idValido(id)} AS UUID)`
  if (!filas[0]) throw new AnalysisError('NOT_FOUND', 404, 'Conversación no encontrada.')
  return filas[0]
}
export async function eliminarConversacion(usuarioId: number, id: unknown) {
  await getPrismaClient().$executeRaw`DELETE FROM ia_conversacion WHERE usuario_id=${usuarioId} AND id=CAST(${idValido(id)} AS UUID)`
}
export function contextoConversacion(intercambios: IntercambioIA[]): MensajeChatIA[] {
  const resultado: MensajeChatIA[] = []
  let total = 0
  for (const item of intercambios.slice(-20).reverse()) {
    const longitud = item.pregunta.length + item.respuesta.length
    if (total + longitud > 120000) break
    total += longitud
    resultado.unshift({ rol: 'usuario', texto: item.pregunta }, { rol: 'asistente', texto: item.respuesta })
  }
  return resultado
}
export async function guardarIntercambio(usuarioId: number, conversacion: ConversacionIA | null, pregunta: string, respuesta: RespuestaChatIA) {
  // No persiste propuestas de escritura, únicamente la conversación. Evita reejecutarlas al restaurar una sesión.
  const item: IntercambioIA = { pregunta, respuesta: respuesta.respuesta, referencias: respuesta.referencias, limitaciones: respuesta.limitaciones }
  const intercambios = [...(conversacion?.intercambios ?? []), item].slice(-100)
  const serializado = JSON.stringify(intercambios)
  const db = getPrismaClient()
  if (conversacion) {
    const n = await db.$executeRaw`UPDATE ia_conversacion SET intercambios=CAST(${serializado} AS JSONB), version=version+1, actualizado_en=NOW()
      WHERE usuario_id=${usuarioId} AND id=CAST(${conversacion.id} AS UUID) AND version=${conversacion.version}`
    if (n !== 1) throw new AnalysisError('CHAT_CONFLICT', 409, 'La conversación cambió en otra pestaña. Vuelve a abrirla.')
    return { id: conversacion.id, intercambios }
  }
  const id = randomUUID()
  // El título no incorpora contenido potencialmente personal de la pregunta.
  const titulo = `Conversación ${new Intl.DateTimeFormat('es-GT', { timeZone: 'America/Guatemala', dateStyle:'short', timeStyle:'short' }).format(new Date())}`
  await db.$executeRaw`INSERT INTO ia_conversacion (id, usuario_id, titulo, intercambios, version) VALUES (CAST(${id} AS UUID), ${usuarioId}, ${titulo}, CAST(${serializado} AS JSONB), 1)`
  return { id, intercambios }
}
