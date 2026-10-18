import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Router, raw, type Request, type Response } from 'express'
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

const evidenceRoot = resolve(process.env.VISIT_EVIDENCE_DIR || fileURLToPath(new URL('../../../storage/visits/', import.meta.url)))
const maxPhotoBytes = 2 * 1024 * 1024
const expressRawPhoto = raw({ type: 'image/jpeg', limit: maxPhotoBytes })
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const dateRe = /^\d{4}-\d{2}-\d{2}$/
const statusOptions = ['PENDIENTE','CUMPLIDO','NO_CUMPLIDO'] as const
const validDate = (v: string) => dateRe.test(v) && !Number.isNaN(Date.parse(`${v}T12:00:00Z`)) && new Date(`${v}T12:00:00Z`).toISOString().slice(0,10) === v
const clean = (v: unknown, max: number) => typeof v === 'string' ? v.trim().slice(0, max) : ''
const positive = (v: unknown) => v === '' || v === null || v === undefined || (typeof v === 'number' && Number.isFinite(v) && v >= 0)
function validate(input: unknown, operationId: unknown): { familyId: number; date: string; status: 'PROGRAMADA' | 'REALIZADA'; timeSlot?: 'MANANA' | 'TARDE'; scheduledVisitId?: number; weather: string; checkIn: string; recommendation: string; observations: string; treatment: string; crops: Record<string, unknown>[]; commitments: Record<string, unknown>[]; reviews: { id: string; status: string }[] } | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const v = input as Record<string, unknown>
  const opId = typeof operationId === 'string' && uuid.test(operationId) ? operationId.toLowerCase() : ''
  const date = clean(v.date, 10)
  if (!Number.isSafeInteger(v.familyId) || Number(v.familyId) <= 0 || !dateRe.test(date) ||
      Number.isNaN(Date.parse(`${date}T12:00:00Z`)) ||
      new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date ||
      (v.status !== 'PROGRAMADA' && v.status !== 'REALIZADA')) return null
  if (v.timeSlot !== undefined && !['MANANA', 'TARDE'].includes(String(v.timeSlot))) return null
  if (v.scheduledVisitId !== undefined && (v.status !== 'REALIZADA' || !Number.isSafeInteger(v.scheduledVisitId) || Number(v.scheduledVisitId) <= 0)) return null
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
  for (const [position, item] of v.commitments.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const c = item as Record<string, unknown>
    // Operaciones VIS-03 ya almacenadas en IndexedDB no incluían UUID por compromiso.
    // Asignar uno reproducible para hacer el reintento seguro sin perder compromisos.
    const h = createHash('md5').update(`${opId}:${position}`).digest('hex')
    const legacyId = `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`
    const commitmentId = typeof c.id === 'string' ? c.id.toLowerCase() : legacyId
    if (!uuid.test(commitmentId) || !clean(c.text, 500) || !['Familia','ONG'].includes(String(c.category)) || (c.due && !validDate(String(c.due)))) return null
    commitments.push({ id: commitmentId, text: clean(c.text,500), category: c.category, due: c.due || null })
  }
  const inputReviews = v.reviews ?? []
  if (!Array.isArray(inputReviews) || inputReviews.length > 100 || (v.status === 'PROGRAMADA' && inputReviews.length > 0)) return null
  const reviews: { id: string; status: string }[] = []
  for (const r of inputReviews) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) return null
    const item = r as Record<string, unknown>
    if (typeof item.id !== 'string' || !uuid.test(item.id) || !statusOptions.includes(item.status as (typeof statusOptions)[number])) return null
    reviews.push({ id: item.id.toLowerCase(), status: String(item.status) })
  }
  if (new Set([...commitments.map(c => c.id), ...reviews.map(r => r.id)]).size !== commitments.length + reviews.length) return null
  return {
    familyId: Number(v.familyId), date, status: v.status,
    ...(v.timeSlot ? { timeSlot: v.timeSlot as 'MANANA' | 'TARDE' } : {}),
    ...(v.scheduledVisitId ? { scheduledVisitId: Number(v.scheduledVisitId) } : {}),
    weather: clean(v.weather, 80), checkIn: clean(v.checkIn, 4000),
    recommendation: clean(v.recommendation, 4000), observations: clean(v.observations, 4000),
    treatment: clean(v.treatment, 120), crops, commitments, reviews,
  }
}

function serialize(row: {
  id: number; fecha: Date; estado: string; usuarioResponsable: { nombre: string }; familia: { id: number; nombreReferencia: string; comunidad: { nombre: string } };
}, captura: { operation_id: string; datos: unknown } | null, evidences: { id: number; name: string }[]) {
  return {
    id: row.id, operationId: captura?.operation_id ?? null,
    date: row.fecha.toISOString().slice(0,10), status: row.estado, responsibleName: row.usuarioResponsable.nombre,
    familyId: row.familia.id, familyName: row.familia.nombreReferencia,
    community: row.familia.comunidad.nombre, capture: captura?.datos ?? null,
    evidences: evidences.map(item => ({ ...item, url: `/api/v1/visitas/${row.id}/evidencias/${item.id}` })),
  }
}

visitsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId
    if (!userId) { res.status(401).json({ error: 'Sesión requerida.' }); return }
    const prisma = getPrismaClient()
    const rows = await prisma.visita.findMany({
      where: { usuarioResponsableId: userId },
      include: { usuarioResponsable: { select: { nombre: true } }, familia: { select: { id: true, nombreReferencia: true, comunidad: { select: { nombre: true } } } } },
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }], take: 300,
    })
    const captures = await prisma.$queryRaw<Array<{ visita_id: number; operation_id: string; datos: unknown }>>`
      SELECT "visita_id", "operation_id"::text, "datos" FROM "visita_captura" WHERE "usuario_id" = ${userId}
    `
    const byVisit = new Map(captures.map(c => [c.visita_id, c]))
    const evidenceRows = rows.length ? await prisma.visitaEvidencia.findMany({
      where: { visitaId: { in: rows.map(row => row.id) } },
      include: { evidencia: { select: { id: true, nombreArchivo: true } } },
    }) : []
    const byEvidence = new Map<number, { id: number; name: string }[]>()
    for (const e of evidenceRows) byEvidence.set(e.visitaId, [...(byEvidence.get(e.visitaId) ?? []), { id: e.evidencia.id, name: e.evidencia.nombreArchivo }])
    res.setHeader('Cache-Control','no-store')
    res.json({ data: rows.map(row => serialize(row, byVisit.get(row.id) ?? null, byEvidence.get(row.id) ?? [])) })
  } catch (error) { console.error('Error consultando visitas:',error); res.status(503).json({ error: 'No se pudieron consultar las visitas.' }) }
})

visitsRouter.post('/sync', async (req: Request, res: Response) => {
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') { res.status(403).json({ error: 'Solicitud no autorizada.' }); return }
  const userId = req.session.userId
  if (!userId) { res.status(401).json({ error: 'Sesión requerida.' }); return }
  const operationId: unknown = req.body?.operationId
  const payload = validate(req.body?.payload, operationId)
  if (typeof operationId !== 'string' || !uuid.test(operationId) || req.body?.kind !== 'visits.create.v1' || !payload) {
    res.status(400).json({ error: 'Datos de visita no válidos.' }); return
  }
  const normalizedId = operationId.toLowerCase()
  // VIS-03 legacy: conservar el mismo hash que guardó el backend anterior.
  // Permite reintentar fotografías de visitas creadas antes de VIS-04.
  const legacy = req.body?.payload?.reviews === undefined &&
    Array.isArray(req.body?.payload?.commitments) &&
    req.body.payload.commitments.every((c: unknown) => c && typeof c === 'object' && !('id' in c))
  const hashInput = legacy
    ? { familyId: payload.familyId, date: payload.date, status: payload.status, weather: payload.weather,
        checkIn: payload.checkIn, recommendation: payload.recommendation,
        observations: payload.observations, treatment: payload.treatment, crops: payload.crops,
        commitments: payload.commitments.map(c => ({ text: c.text, category: c.category, due: c.due })) }
    : payload
  const hash = createHash('sha256').update(JSON.stringify(hashInput)).digest('hex')
  const prisma = getPrismaClient()
  try {
    // Compatibilidad idempotente: una cita ya realizada conserva la operación
    // original dentro de datos.programacion, aunque ahora la captura tenga
    // el UUID de la realización. Un reintento de la agenda no crea otra visita.
    const priorSchedule = await prisma.$queryRaw<Array<{ visita_id: number; usuario_id: number; original_hash: string }>>`
      SELECT "visita_id", "usuario_id", "datos"->'programacion'->>'payloadHash' AS "original_hash"
      FROM "visita_captura"
      WHERE "datos"->'programacion'->>'operationId' = ${normalizedId}
      LIMIT 1
    `
    if (priorSchedule.length) {
      if (priorSchedule[0].usuario_id !== userId || priorSchedule[0].original_hash !== hash) {
        res.status(409).json({ error: 'La operación programada ya fue utilizada con otros datos.' }); return
      }
      res.status(200).json({ operationId: normalizedId, accepted: true, duplicate: true, visitId: priorSchedule[0].visita_id })
      return
    }
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
        let visitaId: number
        let storedCapture: Record<string, unknown> = payload
        if (payload.scheduledVisitId) {
          // Transición atómica PROGRAMADA -> REALIZADA, sin crear otra fila Visita.
          // Solo puede completar una cita el técnico responsable de la misma familia.
          const planned = await tx.visita.findFirst({
            where: { id: payload.scheduledVisitId, familiaId: payload.familyId,
              usuarioResponsableId: userId, estado: 'PROGRAMADA' },
            select: { id: true, fecha: true },
          })
          if (!planned) throw new Error('SCHEDULE_CONFLICT')
          const previous = await tx.visitaCaptura.findUnique({
            where: { visitaId: planned.id },
            select: { operationId: true, payloadHash: true, usuarioId: true, datos: true },
          })
          if (previous && previous.usuarioId !== userId) throw new Error('SCHEDULE_CONFLICT')
          const changed = await tx.visita.updateMany({
            where: { id: planned.id, familiaId: payload.familyId,
              usuarioResponsableId: userId, estado: 'PROGRAMADA' },
            data: { estado: 'REALIZADA', fecha: new Date(`${payload.date}T12:00:00Z`),
              condicionClimaticaId: climate?.id ?? null, observaciones: payload.observations || null },
          })
          if (changed.count !== 1) throw new Error('SCHEDULE_CONFLICT')
          visitaId = planned.id
          const plannedData = previous?.datos && typeof previous.datos === 'object' && !Array.isArray(previous.datos)
            ? previous.datos as Record<string, unknown> : {}
          storedCapture = { ...payload, programacion: {
            date: planned.fecha.toISOString().slice(0, 10),
            timeSlot: plannedData.timeSlot ?? null,
            operationId: previous?.operationId ?? null,
            payloadHash: previous?.payloadHash ?? null,
          } }
        } else {
          const visita = await tx.visita.create({ data: {
            familiaId: payload.familyId, usuarioResponsableId: userId, fecha: new Date(`${payload.date}T12:00:00Z`),
            condicionClimaticaId: climate?.id ?? null, tipo: 'TECNICA', estado: payload.status,
            observaciones: payload.observations || null,
          } })
          visitaId = visita.id
        }
        if (payload.commitments.length) {
          await tx.seguimientoVisita.createMany({ data: payload.commitments.map(c => ({
            id: String(c.id), visitaOrigenId: visitaId, texto: String(c.text),
            responsable: String(c.category), fechaLimite: c.due ? new Date(`${c.due}T12:00:00Z`) : null,
          })) })
        }
        // La revisión solo puede resolver compromisos propios de la misma familia.
        for (const review of payload.reviews) {
          const updated = await tx.seguimientoVisita.updateMany({
            where: { id: review.id, visitaOrigen: { familiaId: payload.familyId, fecha: { lte: new Date(`${payload.date}T12:00:00Z`) } } },
            data: { estado: review.status },
          })
          if (updated.count !== 1) throw new Error('El compromiso anterior no está sincronizado o no corresponde a esta familia.')
        }
        if (payload.scheduledVisitId) {
          // Conservar el ID de la visita y actualizar su captura; fotografía y
          // reintentos de realización se vinculan al nuevo operationId.
          await tx.$executeRaw`
            INSERT INTO "visita_captura" ("visita_id", "usuario_id", "operation_id", "payload_hash", "datos")
            VALUES (${visitaId}, ${userId}, CAST(${normalizedId} AS UUID), ${hash}, CAST(${JSON.stringify(storedCapture)} AS JSONB))
            ON CONFLICT ("visita_id") DO UPDATE SET
              "operation_id" = EXCLUDED."operation_id", "payload_hash" = EXCLUDED."payload_hash",
              "datos" = EXCLUDED."datos"
          `
        } else {
          await tx.$executeRaw`
            INSERT INTO "visita_captura" ("visita_id", "usuario_id", "operation_id", "payload_hash", "datos")
            VALUES (${visitaId}, ${userId}, CAST(${normalizedId} AS UUID), ${hash}, CAST(${JSON.stringify(payload)} AS JSONB))
          `
        }
        return visitaId
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
    if (error instanceof Error && error.message === 'SCHEDULE_CONFLICT') {
      res.status(409).json({ error: 'La cita programada ya fue realizada, cambió de familia o corresponde a otro responsable. Actualiza la agenda antes de registrar.' })
      return
    }
    console.error('Error sincronizando visita:', error)
    res.status(503).json({ error: 'No se pudo guardar la visita.' })
  }
})


// Cambiar fecha de una visita programada sin alterar el contenido original de la operación
// de sincronización ni su hash idempotente.
visitsRouter.patch('/agenda/:visitId', async (req: Request, res: Response) => {
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') { res.status(403).json({ error: 'Solicitud no autorizada.' }); return }
  const visitId = Number(req.params.visitId)
  const date = req.body?.date
  if (!Number.isSafeInteger(visitId) || visitId <= 0 || typeof date !== 'string' || !validDate(date)) {
    res.status(400).json({ error: 'Fecha o visita inválida.' }); return
  }
  try {
    const result = await getPrismaClient().visita.updateMany({
      where: { id: visitId, usuarioResponsableId: req.session.userId!, estado: 'PROGRAMADA' },
      data: { fecha: new Date(`${date}T12:00:00Z`) },
    })
    if (result.count !== 1) { res.status(404).json({ error: 'Visita programada no encontrada o ya realizada.' }); return }
    res.json({ accepted: true })
  } catch (error) { console.error('Error reprogramando visita:', error); res.status(503).json({ error: 'No se pudo reprogramar la visita.' }) }
})

// Eliminar una cita PROGRAMADA. Una visita REALIZADA no puede borrarse
// desde la agenda: sus datos técnicos y evidencias deben preservarse.
visitsRouter.delete('/agenda/:visitId', async (req: Request, res: Response) => {
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') { res.status(403).json({ error: 'Solicitud no autorizada.' }); return }
  const visitId = Number(req.params.visitId)
  if (!Number.isSafeInteger(visitId) || visitId <= 0) { res.status(400).json({ error: 'Visita inválida.' }); return }
  try {
    const result = await getPrismaClient().visita.deleteMany({
      where: {
        id: visitId,
        usuarioResponsableId: req.session.userId!,
        estado: 'PROGRAMADA',
        compromisosVisita: { none: {} },
        evaluaciones: { none: {} },
        evidencias: { none: {} },
        alertas: { none: {} },
      },
    })
    if (result.count !== 1) {
      res.status(404).json({ error: 'La visita programada no existe, ya fue realizada o no puedes eliminarla.' }); return
    }
    res.setHeader('Cache-Control', 'no-store')
    res.json({ accepted: true })
  } catch (error) {
    console.error('Error eliminando visita programada:', error)
    res.status(503).json({ error: 'No se pudo eliminar la visita programada.' })
  }
})

// VIS-04: Consultar compromisos, incluyendo su visita de origen.
visitsRouter.get('/seguimientos', async (req: Request, res: Response) => {
  try {
    const rows = await getPrismaClient().seguimientoVisita.findMany({
      // Los compromisos pertenecen a la familia, no exclusivamente al técnico que los creó.
      // Cualquier usuario con VISITAS_READ puede consultarlos (instancia de una ONG).
      where: {},
      include: { visitaOrigen: { include: { familia: { include: { comunidad: { select: { nombre: true } } } } } } },
      orderBy: [{ fechaLimite: 'asc' }, { creadoEn: 'desc' }], take: 500,
    })
    res.setHeader('Cache-Control', 'no-store')
    res.json({ data: rows.map(r => ({
      id: r.id, sourceVisitId: r.visitaOrigenId, familyId: r.visitaOrigen.familiaId,
      familyName: r.visitaOrigen.familia.nombreReferencia,
      community: r.visitaOrigen.familia.comunidad.nombre,
      date: r.visitaOrigen.fecha.toISOString().slice(0,10),
      text: r.texto, category: r.responsable,
      due: r.fechaLimite?.toISOString().slice(0,10) ?? null,
      status: r.estado, observation: r.observacionCierre,
    })) })
  } catch (error) { console.error('Error consultando seguimientos:', error); res.status(503).json({ error: 'No se pudieron consultar los compromisos.' }) }
})

// Actualizaciones manuales desde agenda: requieren red, se limitan a visitas propias.
visitsRouter.patch('/seguimientos/:id', async (req: Request, res: Response) => {
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') { res.status(403).json({ error: 'Solicitud no autorizada.' }); return }
  const id = String(req.params.id ?? '').toLowerCase()
  if (!uuid.test(id)) { res.status(400).json({ error: 'Compromiso inválido.' }); return }
  const { status, due, text, observation } = req.body ?? {}
  if (!statusOptions.includes(status) || (due !== null && due !== undefined && (typeof due !== 'string' || !validDate(due))) ||
    (typeof text !== 'string' || !text.trim() || text.trim().length > 500) ||
    (observation !== undefined && (typeof observation !== 'string' || observation.length > 2000))) {
    res.status(400).json({ error: 'Verifica el estado, la fecha y el texto.' }); return
  }
  try {
    const prisma = getPrismaClient()
    const result = await prisma.seguimientoVisita.updateMany({
      where: { id },
      data: { estado: status, fechaLimite: due ? new Date(`${due}T12:00:00Z`) : null,
        texto: text.trim(), observacionCierre: observation?.trim() || null },
    })
    if (result.count !== 1) { res.status(404).json({ error: 'Compromiso no encontrado.' }); return }
    res.json({ accepted: true })
  } catch (error) { console.error('Error actualizando seguimiento:', error); res.status(503).json({ error: 'No se pudo actualizar el compromiso.' }) }
})

// Evidencia privada: ruta autenticada, ligada a la visita del usuario y nunca servida como carpeta pública.
visitsRouter.get('/:visitId/evidencias/:evidenceId', async (req: Request, res: Response) => {
  const visitId = Number(req.params.visitId)
  const evidenceId = Number(req.params.evidenceId)
  if (!Number.isSafeInteger(visitId) || visitId <= 0 || !Number.isSafeInteger(evidenceId) || evidenceId <= 0) {
    res.status(400).json({ error: 'Identificador inválido.' }); return
  }
  try {
    const prisma = getPrismaClient()
    const relation = await prisma.visitaEvidencia.findFirst({
      where: { visitaId: visitId, evidenciaId: evidenceId, visita: { usuarioResponsableId: req.session.userId! } },
      include: { evidencia: { select: { rutaArchivo: true } } },
    })
    const pathMatch = /^visits\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.jpg$/.exec(relation?.evidencia.rutaArchivo ?? '')
    if (!pathMatch || !uuid.test(pathMatch[1]) || !uuid.test(pathMatch[2])) { res.status(404).end(); return }
    const bytes = await readFile(join(evidenceRoot, pathMatch[1], `${pathMatch[2]}.jpg`))
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.type('image/jpeg').send(bytes)
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') { res.status(404).end(); return }
    console.error('No se pudo consultar la evidencia:', error)
    res.status(503).json({ error: 'No se pudo consultar la fotografía.' })
  }
})

// Express.raw limita el tamaño y evita convertir fotos a Base64 en el JSON del formulario.
visitsRouter.post('/:operationId/evidencias/:photoId',
  expressRawPhoto, async (req: Request, res: Response) => {
    if (req.get('X-Requested-With') !== 'XMLHttpRequest') { res.status(403).json({ error: 'Solicitud no autorizada.' }); return }
    const operationId = String(req.params.operationId ?? '').toLowerCase()
    const photoId = String(req.params.photoId ?? '').toLowerCase()
    if (!uuid.test(operationId) || !uuid.test(photoId)) { res.status(400).json({ error: 'Identificador inválido.' }); return }
    const bytes = req.body
    if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > maxPhotoBytes ||
      bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) {
      res.status(415).json({ error: 'Se requiere una imagen JPEG válida de máximo 2 MB.' }); return
    }
    const relativePath = `visits/${operationId}/${photoId}.jpg`
    const fileDir = join(evidenceRoot, operationId)
    const filePath = join(fileDir, `${photoId}.jpg`)
    let name = 'Fotografía.jpg'
    try { name = decodeURIComponent(req.get('X-File-Name') ?? name).replace(/[\\/\x00-\x1f]/g, '').slice(0, 120) || name }
    catch { /* Usar nombre genérico */ }
    const prisma = getPrismaClient()
    try {
      const capture = await prisma.visitaCaptura.findUnique({ where: { operationId }, select: { visitaId: true, usuarioId: true } })
      if (!capture || capture.usuarioId !== req.session.userId) { res.status(404).json({ error: 'Visita no encontrada.' }); return }
      const count = await prisma.visitaEvidencia.count({ where: { visitaId: capture.visitaId } })
      const already = await prisma.evidencia.findFirst({ where: { rutaArchivo: relativePath }, select: { id: true } })
      if (!already && count >= 4) { res.status(422).json({ error: 'Se admiten hasta 4 fotos por visita.' }); return }

      await mkdir(fileDir, { recursive: true, mode: 0o700 })
      try { await writeFile(filePath, bytes, { flag: 'wx', mode: 0o600 }) }
      catch (err) { if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err }
      // Un reintento no puede reemplazar una foto previa con un contenido diferente.
      const currentBytes = await readFile(filePath)
      if (!currentBytes.equals(bytes)) { res.status(409).json({ error: 'Foto con ID ya existente y otro contenido.' }); return }
      const evidence = await prisma.$transaction(async tx => {
        // Serializa los reintentos concurrentes del mismo archivo (sin una migración nueva).
        await tx.$queryRaw<{ acquired: number }[]>`SELECT 1::integer AS acquired FROM pg_advisory_xact_lock(hashtext(${relativePath})::bigint)`
        const existing = await tx.evidencia.findFirst({ where: { rutaArchivo: relativePath }, select: { id: true } })
        if (existing) {
          const linked = await tx.visitaEvidencia.findUnique({ where: { visitaId_evidenciaId: { visitaId: capture.visitaId, evidenciaId: existing.id } } })
          if (!linked) throw new Error('Evidencia asociada a otra visita.')
          return existing
        }
        // El límite se vuelve a comprobar dentro del bloqueo por visita en la transacción.
        await tx.$queryRaw<{ acquired: number }[]>`SELECT 1::integer AS acquired FROM pg_advisory_xact_lock(${capture.visitaId}::bigint)`
        if (await tx.visitaEvidencia.count({ where: { visitaId: capture.visitaId } }) >= 4) throw new Error('Límite de cuatro fotografías alcanzado.')
        const created = await tx.evidencia.create({ data: {
          nombreArchivo: name, rutaArchivo: relativePath, tipoArchivo: 'image/jpeg', fechaRegistro: new Date(),
        } })
        await tx.visitaEvidencia.create({ data: { visitaId: capture.visitaId, evidenciaId: created.id } })
        return created
      })
      res.status(already ? 200 : 201).json({ accepted: true, evidenceId: evidence.id })
    } catch (error) {
      console.error('Error guardando evidencia:', error)
      res.status(503).json({ error: 'No fue posible guardar la fotografía; se reintentará.' })
    }
  },
)
