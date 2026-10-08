import type { Request, Response } from 'express'
import { createFamily, findFamily, listFamilies } from './families.service.js'
import { parseFamilyId, validateFamilyInput } from './families.validation.js'

export async function postFamily(req: Request, res: Response) {
  const result = validateFamilyInput(req.body)
  if (!result.data) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos de la familia.', details: result.details } })
  try {
    const family = await createFamily(result.data)
    if (!family) return res.status(400).json({ error: {
      code: 'VALIDATION_ERROR', message: 'Revisa la comunidad seleccionada.',
      details: [{ field: 'comunidadId', message: 'La comunidad debe existir y estar activa, al igual que su municipio.' }],
    } })
    return res.status(201).location(`/api/v1/familias/${family.id}`).json({ data: family })
  } catch (error) {
    console.error('Failed to create family:', error)
    return res.status(500).json({ error: { code: 'FAMILY_CREATE_ERROR', message: 'No fue posible guardar la familia. Intenta nuevamente.' } })
  }
}

export async function getFamily(req: Request, res: Response) {
  const id = parseFamilyId(req.params.id)
  if (id === null) return res.status(400).json({ error: {
    code: 'VALIDATION_ERROR', message: 'El identificador no es válido.',
    details: [{ field: 'id', message: 'El identificador debe ser un entero positivo válido.' }],
  } })
  try {
    const family = await findFamily(id)
    if (!family) return res.status(404).json({ error: { code: 'FAMILY_NOT_FOUND', message: 'La familia solicitada no existe.' } })
    return res.json({ data: family })
  } catch (error) {
    console.error('Failed to get family:', error)
    return res.status(500).json({ error: { code: 'FAMILY_DETAIL_ERROR', message: 'No fue posible consultar la familia.' } })
  }
}

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const MAX_DATABASE_INTEGER = 2_147_483_647

function parsePositiveInteger(value: unknown, fallback: number): number | null {
  if (value === undefined) {
    return fallback
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return null
  }

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function optionalPositiveInteger(value: unknown): number | null | undefined {
  if (value === undefined || value === '') {
    return undefined
  }

  const parsed = parsePositiveInteger(value, 0)
  return parsed !== null && parsed <= MAX_DATABASE_INTEGER ? parsed : null
}

function parseOptionalText(value: unknown): string | null {
  if (value === undefined) return ''
  return typeof value === 'string' ? value.trim() : null
}

export async function getFamilies(req: Request, res: Response) {
  const page = parsePositiveInteger(req.query.page, DEFAULT_PAGE)
  const parsedLimit = parsePositiveInteger(req.query.limit, DEFAULT_LIMIT)
  const comunidadId = optionalPositiveInteger(req.query.comunidadId)
  const programaId = optionalPositiveInteger(req.query.programaId)
  const search = parseOptionalText(req.query.search)
  const status = parseOptionalText(req.query.estado)

  if (page === null || parsedLimit === null || comunidadId === null || programaId === null || search === null || status === null) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los parámetros de consulta no son válidos.',
      },
    })
  }

  const limit = parsedLimit
  const offset = (page - 1) * limit

  if (limit > MAX_LIMIT || !Number.isSafeInteger(offset) || offset > MAX_DATABASE_INTEGER) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'La paginación está fuera del rango permitido. El límite máximo es de 100 registros.',
      },
    })
  }

  if (search.length > 100 || status.length > 30) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los parámetros de búsqueda exceden la longitud permitida.',
      },
    })
  }

  try {
    const result = await listFamilies({
      search: search || undefined,
      estado: status || undefined,
      comunidadId,
      programaId,
      page,
      limit,
    })

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error al consultar familias:', error)
    return res.status(500).json({
      error: {
        code: 'FAMILY_LIST_ERROR',
        message: 'No fue posible consultar las familias registradas.',
      },
    })
  }
}
