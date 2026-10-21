import { getPrismaClient } from '../../config/prisma.js'
import { Prisma } from '../../generated/prisma/client.js'
import type { ProgramFieldError, ProgramInput } from './programs.validation.js'

export class ProgramError extends Error {
  constructor(
    public readonly status: 404 | 409,
    public readonly code: string,
    message: string,
    public readonly details: ProgramFieldError[] = [],
  ) { super(message) }
}

const programSelect = {
  id: true, nombre: true, descripcion: true, fechaInicio: true, fechaFin: true,
  estado: true, _count: { select: { familias: true } },
} satisfies Prisma.ProgramaSelect

type ProgramRecord = Prisma.ProgramaGetPayload<{ select: typeof programSelect }>

function formatProgram(program: ProgramRecord) {
  const { _count, ...data } = program
  return {
    ...data,
    fechaInicio: data.fechaInicio?.toISOString().slice(0, 10) ?? null,
    fechaFin: data.fechaFin?.toISOString().slice(0, 10) ?? null,
    participacionesCount: _count.familias,
  }
}

const asDate = (day: string | null): Date | null => day ? new Date(`${day}T00:00:00.000Z`) : null
const programData = (input: ProgramInput) => ({
  nombre: input.nombre,
  descripcion: input.descripcion,
  fechaInicio: asDate(input.fechaInicio),
  fechaFin: asDate(input.fechaFin),
  estado: input.estado,
})

async function ensureAvailableName(tx: Prisma.TransactionClient, nombre: string, exceptId?: number) {
  // Evita carreras entre altas y cambios de nombre con distinta capitalización.
  const canonical = `programa:${nombre.toLocaleLowerCase('es')}`
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${canonical}, 0))`
  const exists = await tx.programa.findFirst({
    where: { nombre: { equals: nombre, mode: 'insensitive' }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  })
  if (exists) throw new ProgramError(409, 'DUPLICATE_PROGRAM', 'Ya existe un programa con ese nombre.', [
    { field: 'nombre', message: 'Utiliza un nombre diferente.' },
  ])
}

export async function listProgramsForAdmin() {
  const programs = await getPrismaClient().programa.findMany({
    orderBy: [{ nombre: 'asc' }, { id: 'asc' }], select: programSelect,
  })
  return programs.map(formatProgram)
}

export async function listAvailablePrograms() {
  return getPrismaClient().programa.findMany({
    where: { estado: 'ACTIVO' }, orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
    select: { id: true, nombre: true, descripcion: true, estado: true },
  })
}

export async function createProgram(input: ProgramInput, userId: number) {
  return getPrismaClient().$transaction(async (tx) => {
    await ensureAvailableName(tx, input.nombre)
    const record = await tx.programa.create({ data: programData(input), select: programSelect })
    const output = formatProgram(record)
    await tx.bitacora.create({ data: {
      usuarioId: userId, entidad: 'programa', registroId: String(record.id), accion: 'CREATE', fecha: new Date(),
      datosNuevos: JSON.stringify(output), descripcion: 'Registro de programa institucional.',
    } })
    return output
  })
}

export async function updateProgram(id: number, input: ProgramInput, userId: number) {
  return getPrismaClient().$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM programa WHERE id = ${id} FOR UPDATE`
    if (!locked.length) throw new ProgramError(404, 'PROGRAM_NOT_FOUND', 'El programa solicitado no existe.')
    const previous = await tx.programa.findUniqueOrThrow({ where: { id }, select: programSelect })
    const before = formatProgram(previous)
    // Permite conservar un nombre propio, sin marcarlo como duplicado.
    if (previous.nombre !== input.nombre) await ensureAvailableName(tx, input.nombre, id)
    const target = programData(input)
    const unchanged = previous.nombre === target.nombre && previous.descripcion === target.descripcion &&
      (before.fechaInicio === input.fechaInicio) && (before.fechaFin === input.fechaFin) && previous.estado === target.estado
    if (unchanged) return before
    const record = await tx.programa.update({ where: { id }, data: target, select: programSelect })
    const output = formatProgram(record)
    await tx.bitacora.create({ data: {
      usuarioId: userId, entidad: 'programa', registroId: String(id), accion: 'UPDATE', fecha: new Date(),
      datosAnteriores: JSON.stringify(before), datosNuevos: JSON.stringify(output),
      descripcion: 'Actualización del programa institucional.',
    } })
    return output
  })
}
