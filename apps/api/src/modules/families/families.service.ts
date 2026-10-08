import { getPrismaClient } from '../../config/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'
import type { FamilyListFilters, FamilyListItem } from './families.types.js'

export type FamilyListResult = {
  data: FamilyListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export async function listFamilies(filters: FamilyListFilters): Promise<FamilyListResult> {
  const prisma = getPrismaClient()
  const { search, estado, comunidadId, programaId, page, limit } = filters

  const where: Prisma.FamiliaWhereInput = {
    ...(estado && {
      estado: {
        equals: estado,
        mode: 'insensitive',
      },
    }),
    ...(comunidadId && { comunidadId }),
    ...(programaId && {
      programas: {
        some: { programaId },
      },
    }),
    ...(search && {
      OR: [
        {
          nombreReferencia: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          comunidad: {
            nombre: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          integrantes: {
            some: {
              nombreCompleto: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          programas: {
            some: {
              programa: {
                nombre: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
      ],
    }),
  }

  const [families, total] = await prisma.$transaction([
    prisma.familia.findMany({
      where,
      orderBy: [{ nombreReferencia: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        nombreReferencia: true,
        fechaIngreso: true,
        estado: true,
        comunidad: {
          select: {
            id: true,
            nombre: true,
          },
        },
        programas: {
          orderBy: { programa: { nombre: 'asc' } },
          select: {
            estado: true,
            programa: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
        _count: {
          select: {
            integrantes: true,
          },
        },
      },
    }),
    prisma.familia.count({ where }),
  ])

  const data: FamilyListItem[] = families.map((family) => ({
    id: family.id,
    nombreReferencia: family.nombreReferencia,
    fechaIngreso: family.fechaIngreso,
    estado: family.estado,
    comunidad: family.comunidad,
    programas: family.programas.map(({ programa, estado: programStatus }) => ({
      id: programa.id,
      nombre: programa.nombre,
      estado: programStatus,
    })),
    integrantes: family._count.integrantes,
  }))

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  }
}
