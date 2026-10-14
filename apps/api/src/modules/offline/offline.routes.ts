import { Router, type Request, type Response } from 'express'
import { getPrismaClient } from '../../config/prisma.js'

export const offlineDemoRouter = Router()

const KIND = 'demo.field-note.create'
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type DemoSyncBody = {
  operationId: string
  kind: typeof KIND
  payload: { title: string; observation: string }
}

function validate(value: unknown): DemoSyncBody | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const v = value as Record<string, unknown>
  if (Object.keys(v).sort().join(',') !== 'kind,operationId,payload') return null
  if (typeof v.operationId !== 'string' || !UUID_V4.test(v.operationId)) return null
  if (v.kind !== KIND || !v.payload || typeof v.payload !== 'object' || Array.isArray(v.payload)) return null
  const p = v.payload as Record<string, unknown>
  if (Object.keys(p).sort().join(',') !== 'observation,title') return null
  if (typeof p.title !== 'string' || !p.title.trim() || p.title.length > 80) return null
  if (typeof p.observation !== 'string' || !p.observation.trim() || p.observation.length > 500) return null
  return {
    operationId: v.operationId.toLowerCase(),
    kind: KIND,
    payload: { title: p.title.trim(), observation: p.observation.trim() },
  }
}

/** Endpoints exclusivamente locales y de pruebas. NO permiten datos de beneficiarios. */
offlineDemoRouter.post('/demo-notes', async (req: Request, res: Response) => {
  const remote = req.ip ?? req.socket.remoteAddress ?? ''
  const loopback = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1'
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_OFFLINE_DEMO_SYNC !== 'true' || !loopback) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no disponible.' } })
    return
  }

  const input = validate(req.body)
  if (!input) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Operación de prueba inválida.' } })
    return
  }

  try {
    const db = getPrismaClient()
    const payloadJson = JSON.stringify(input.payload)
    // ON CONFLICT sobre UUID: una misma operación nunca crea dos filas.
    const inserted = await db.$queryRaw<Array<{ operation_id: string }>>`
      INSERT INTO "offline_demo_note" ("operation_id", "kind", "payload")
      VALUES (CAST(${input.operationId} AS uuid), ${input.kind}, CAST(${payloadJson} AS jsonb))
      ON CONFLICT ("operation_id") DO NOTHING
      RETURNING "operation_id"
    `

    if (inserted.length === 0) {
      // Mismo UUID con datos distintos es conflicto, no una confirmación falsa.
      const matching = await db.$queryRaw<Array<{ operation_id: string }>>`
        SELECT "operation_id" FROM "offline_demo_note"
        WHERE "operation_id" = CAST(${input.operationId} AS uuid)
          AND "kind" = ${input.kind}
          AND "payload" = CAST(${payloadJson} AS jsonb)
      `
      if (matching.length === 0) {
        res.status(409).json({ error: { code: 'IDEMPOTENCY_CONFLICT', message: 'Este identificador ya existe con otros datos.' } })
        return
      }
    }

    res.status(inserted.length ? 201 : 200).json({
      operationId: input.operationId,
      accepted: true,
      duplicate: inserted.length === 0,
    })
  } catch (error) {
    console.error('Error de sincronización de demostración:', error)
    res.status(503).json({ error: { code: 'SYNC_UNAVAILABLE', message: 'No fue posible persistir la operación.' } })
  }
})
