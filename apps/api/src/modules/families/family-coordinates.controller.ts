import type { Request, Response } from 'express'
import { getPrismaClient } from '../../config/prisma.js'
import { parseFamilyId } from './families.validation.js'

// Endpoint restringido: NO adjuntar coordenadas a listados, dashboard ni expedientes generales.
export async function getFamilyCoordinates(req: Request, res: Response) {
  const id = parseFamilyId(req.params.id)
  if (id === null) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Identificador no válido.' } })
  res.setHeader('Cache-Control', 'private, no-store')
  try {
    const records = await getPrismaClient().$queryRaw<Array<{ latitud: number | null; longitud: number | null }>>`
      SELECT latitud, longitud FROM familia WHERE id = ${id}
    `
    if (!records.length) return res.status(404).json({ error: { code: 'FAMILY_NOT_FOUND', message: 'Familia no encontrada.' } })
    return res.json({ data: records[0] })
  } catch (error) {
    console.error('Failed to read family coordinates:', error)
    return res.status(500).json({ error: { code: 'FAMILY_COORDINATES_ERROR', message: 'No fue posible consultar la ubicación.' } })
  }
}
