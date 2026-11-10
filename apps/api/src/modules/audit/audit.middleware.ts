import type { RequestHandler } from 'express'
import { getPrismaClient } from '../../config/prisma.js'
import { classifyAuditOperation, pathRecordId, responseRecordId, safeAuditMetadata } from './audit.rules.js'

/**
 * Auditoría centralizada de solicitudes HTTP relevantes.
 * No guarda req.body, respuestas, cookies, credenciales ni query strings.
 * Registro asíncrono tras finalizar la respuesta: no es una garantía transaccional.
 */
export const auditOperations: RequestHandler = (req, res, next) => {
  const path = req.originalUrl.split('?')[0] ?? ''
  const operation = classifyAuditOperation(req.method, path)
  if (!operation) return next()

  // Antes del logout se destruye la sesión. En login se obtiene el nuevo ID al finalizar.
  const initialUserId = req.session.userId
  let createdRecordId: string | null = null
  const originalJson = res.json.bind(res)
  res.json = ((body: unknown) => {
    createdRecordId = responseRecordId(body)
    return originalJson(body)
  }) as typeof res.json

  res.once('finish', () => {
    const userId = initialUserId ?? req.session?.userId
    // Para una autenticación fallida no existe un actor verificable en bitacora.usuario_id.
    if (!userId) return

    const estadoHttp = res.statusCode
    const metadata = safeAuditMetadata(req.method, path, estadoHttp)
    const exito = estadoHttp >= 200 && estadoHttp < 400
    const registroId = exito && req.method === 'POST'
      ? createdRecordId ?? pathRecordId(path)
      : pathRecordId(path) ?? (exito ? createdRecordId : null)

    try {
      void getPrismaClient().bitacora.create({
        data: {
          usuarioId: userId,
          entidad: operation.entidad,
          registroId,
          accion: operation.accion,
          fecha: new Date(),
          datosAnteriores: null,
          datosNuevos: metadata,
          descripcion: `${operation.accion} ${operation.entidad}: ${exito ? 'operación atendida' : 'solicitud rechazada'} (HTTP ${estadoHttp})`,
        },
      }).catch((error: unknown) => {
        console.error('[AUDITORIA] No se pudo guardar el evento de operación:', error)
      })
    } catch (error) {
      // También captura errores síncronos al construir el cliente Prisma.
      console.error('[AUDITORIA] No se pudo inicializar el registro de auditoría:', error)
    }
  })
  next()
}
