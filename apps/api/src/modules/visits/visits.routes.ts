import { createHash } from 'node:crypto'
import { Router, type Request, type Response } from 'express'
import { getPrismaClient } from '../../config/prisma.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { getAuthenticatedUser } from '../auth/auth.service.js'

export const visitsRouter = Router()
visitsRouter.use(requireAuth)
visitsRouter.use(async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req.session.userId!)
    const allowed = req.method === 'GET'
      ? ['SYN-VISITAS-WRITE','VISITAS_READ','VISITAS_WRITE'].some(p => user?.permisos.includes(p))
      : ['SYN-VISITAS-WRITE','VISITAS_WRITE'].some(p => user?.permisos.includes(p))
    if (!allowed) { res.status(403).json({ error: 'No tienes permiso para gestionar visitas.' }); return }
    next()
  } catch (error) { next(error) }
})

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const dateRe = /^\d{4}-\d{2}-\d{2}$/
const clean = (v: unknown, max: number) => typeof v === 'string' ? v.trim().slice(0, max) : ''
const positive = (v: unknown) => v === '' || v === null || v === undefined || (typeof v === 'number' && Number.isFinite(v) && v >= 0)
function validate(input: unknown): { familyId: number; date: string; status: 'PROGRAMADA' | 'REALIZADA'; weather: string; checkIn: string; recommendation: string; observations: string; treatment: string; crops: Record<string, unknown>[]; commitments: Record<string, unknown>[] } | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const v = input as Record<string, unknown>
  const date = clean(v.date, 10)
  if (!Number.isSafeInteger(v.familyId) || Number(v.familyId) <= 0 || !dateRe.test(date) ||
      Number.isNaN(Date.parse(`${date}T12:00:00Z`)) ||
      new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date ||
      (v.status !== 'PROGRAMADA' && v.status !== 'REALIZADA')) return null
  if (!Array.isArray(v.crops) || v.crops.length > 30 || !Array.isArray(v.commitments) || v.commitments.length > 30) return null
  const crops: Record<string, unknown>[] = []
  for (const item of v.crops) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const c = item as Record<string, unknown>
    if (!clean(c.name, 80) || !Array.isArray(c.findings) || c.findings.length > 20) return null
    if (c.findings.some(f => !f || typeof f !== 'object' || !['plaga','enfermedad'].includes((f as Record<string,unknown>).type as string) || !clean((f as Record<string,unknown>).name,100) || !['1','3','5','10','20'].includes(String((f as Record<string,unknown>).damage)))) return null
    for (const name of ['plants','perPlantUnits','perPlantKg','units','kg','priceQ','priceUSD']) {
      if (!positive(c[name])) return null
    }
    if (c.plants !== null && c.plants !== undefined && c.plants !== '' && !Number.isSafeInteger(c.plants)) return null
    crops.push({
      name: clean(c.name,80), stage: clean(c.stage,60), quality: clean(c.quality,60),
      plants: c.plants ?? null, production: Boolean(c.production),
      perPlantUnits: c.perPlantUnits ?? null, perPlantKg: c.perPlantKg ?? null,
      units: c.units ?? null, kg: c.kg ?? null, priceQ: c.priceQ ?? null,
      priceUSD: c.priceUSD ?? null, priceBasis: c.priceBasis === 'kg' ? 'kg' : 'unidad',
      findings: c.findings.map((finding: Record<string,unknown>) => ({
        type: finding.type, name: clean(finding.name,100), damage: clean(finding.damage,12),
      })),
    })
  }
  const commitments: Record<string, unknown>[] = []
  for (const item of v.commitments) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const c = item as Record<string, unknown>
    if (!clean(c.text, 500) || !['Familia','ONG'].includes(String(c.category)) || (c.due && (!dateRe.test(String(c.due)) || Number.isNaN(Date.parse(String(c.due)))))) return null
    commitments.push({ text: clean(c.text,500), category: c.category, due: c.due || null })
  }
  return {
    familyId: Number(v.familyId), date, status: v.status,
    weather: clean(v.weather, 80), checkIn: clean(v.checkIn, 4000),
    recommendation: clean(v.recommendation, 4000), observations: clean(v.observations, 4000),
    treatment: clean(v.treatment, 120), crops, commitments,
  }
}

function serialize(row: {
  id: number; fecha: Date; estado: string; familia: { id: number; nombreReferencia: string; comunidad: { nombre: string } };
}, captura: { operation_id: string; datos: unknown } | null) {
  return {
    id: row.id, operationId: captura?.operation_id ?? null,
    date: row.fecha.toISOString().slice(0,10), status: row.estado,
    familyId: row.familia.id, familyName: row.familia.nombreReferencia,
    community: row.familia.comunidad.nombre, capture: captura?.datos ?? null,
  }
}

visitsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId
    if (!userId) { res.status(401).json({ error: 'Sesión requerida.' }); return }
    const prisma = getPrismaClient()
    const rows = await prisma.visita.findMany({
      where: { usuarioResponsableId: userId },
      include: { familia: { select: { id: true, nombreReferencia: true, comunidad: { select: { nombre: true } } } } },
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }], take: 300,
    })
    const captures = await prisma.$queryRaw<Array<{ visita_id: number; operation_id: string; datos: unknown }>>`
      SELECT "visita_id", "operation_id"::text, "datos" FROM "visita_captura" WHERE "usuario_id" = ${userId}
    `
    const byVisit = new Map(captures.map(c => [c.visita_id, c]))
    res.setHeader('Cache-Control','no-store')
    res.json({ data: rows.map(row => serialize(row, byVisit.get(row.id) ?? null)) })
  } catch (error) { console.error('Error consultando visitas:',error); res.status(503).json({ error: 'No se pudieron consultar las visitas.' }) }
})

visitsRouter.post('/sync', async (req: Request, res: Response) => {
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') { res.status(403).json({ error: 'Solicitud no autorizada.' }); return }
  const userId = req.session.userId
  if (!userId) { res.status(401).json({ error: 'Sesión requerida.' }); return }
  const operationId: unknown = req.body?.operationId
  const payload = validate(req.body?.payload)
  if (typeof operationId !== 'string' || !uuid.test(operationId) || req.body?.kind !== 'visits.create.v1' || !payload) {
    res.status(400).json({ error: 'Datos de visita no válidos.' }); return
  }
  const normalizedId = operationId.toLowerCase()
  const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex')
  const prisma = getPrismaClient()
  try {
    const persist = async () => {
      const existing = await prisma.$queryRaw<Array<{ visita_id: number; usuario_id: number; payload_hash: string }>>`
        SELECT "visita_id", "usuario_id", "payload_hash" FROM "visita_captura" WHERE "operation_id" = CAST(${normalizedId} AS UUID)
      `
      if (existing.length) {
        if (existing[0].payload_hash !== hash || existing[0].usuario_id !== userId) {
          return { conflict: true, visitId: null, duplicate: true }
        }
        return { conflict: false, visitId: existing[0].visita_id, duplicate: true }
      }
      if (!await prisma.familia.findUnique({ where: { id: payload.familyId }, select: { id:true } })) return null
      const climate = payload.weather ? await prisma.condicionClimatica.findFirst({ where: { nombre: { equals: payload.weather, mode: 'insensitive' }, activo: true }, select: { id:true } }) : null
      const created = await prisma.$transaction(async tx => {
        const visita = await tx.visita.create({ data: {
          familiaId: payload.familyId, usuarioResponsableId: userId, fecha: new Date(`${payload.date}T12:00:00Z`),
          condicionClimaticaId: climate?.id ?? null, tipo: 'TECNICA', estado: payload.status,
          observaciones: payload.observations || null,
        } })
        await tx.$executeRaw`
          INSERT INTO "visita_captura" ("visita_id", "usuario_id", "operation_id", "payload_hash", "datos")
          VALUES (${visita.id}, ${userId}, CAST(${normalizedId} AS UUID), ${hash}, CAST(${JSON.stringify(payload)} AS JSONB))
        `
        return visita.id
      })
      return { conflict: false, visitId: created, duplicate: false }
    }
    let result
    try { result = await persist() }
    catch (err: unknown) {
      if (err && typeof err === 'object' && ('code' in err && (err.code === 'P2002' || err.code === 'P2010'))) result = await persist()
      else throw err
    }
    if (result === null) { res.status(422).json({ error: 'La familia no existe.' }); return }
    if (!result || result.conflict) { res.status(409).json({ error: 'Identificador utilizado por otra operación.' }); return }
    res.status(result.duplicate ? 200 : 201).json({ operationId: normalizedId, accepted: true, duplicate: result.duplicate, visitId: result.visitId })
  } catch (error) {
    console.error('Error sincronizando visita:', error)
    res.status(503).json({ error: 'No se pudo guardar la visita.' })
  }
})
