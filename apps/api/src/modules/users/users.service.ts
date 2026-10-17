
import { getPrismaClient } from '../../config/prisma.js'
import argon2 from 'argon2'
import { randomBytes } from 'node:crypto'

export async function listarUsuarios() {
  const prisma = getPrismaClient()

  return prisma.usuario.findMany({
    select: {
      id: true,
      nombre: true,
      apellido: true,
      telefono: true,
      correo: true,
      estado: true,
      ultimoAcceso: true,
      fechaCreacion: true,
      roles: {
        select: {
          rol: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      },
    },
    orderBy: {
      id: 'desc',
    },
  })
}


export type NuevoUsuario = {
  nombre: string
  apellido: string
  correo: string
  telefono: string
  rolId: number
}

export class ErrorUsuario extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export async function obtenerRolesDisponibles() {
  const prisma = getPrismaClient()

  return prisma.rol.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
    },
    orderBy: { nombre: 'asc' },
  })
}

export async function crearUsuario(datos: NuevoUsuario) {
  const prisma = getPrismaClient()

  const nombre = datos.nombre.trim()
  const apellido = datos.apellido.trim()
  const correo = datos.correo.trim().toLowerCase()
  const telefono = datos.telefono.trim()

  if (
    !nombre ||
    !apellido ||
    !telefono ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
    !Number.isInteger(datos.rolId)
  ) {
    throw new ErrorUsuario(400, 'Datos de usuario inválidos.')
  }

  const rol = await prisma.rol.findFirst({
    where: {
      id: datos.rolId,
      activo: true,
    },
  })

  if (!rol) {
    throw new ErrorUsuario(400, 'El rol seleccionado no existe o está inactivo.')
  }

  // Credencial temporal aleatoria: nunca se guarda en texto plano.
  const passwordTemporal = randomBytes(32).toString('base64url')
  const passwordHash = await argon2.hash(passwordTemporal)

  try {
    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        apellido,
        correo,
        telefono,
        passwordHash,
        debeCambiarPassword: true,
        estado: 'ACTIVO',
        fechaCreacion: new Date(),
        roles: {
          create: {
            rol: {
              connect: { id: rol.id },
            },
          },
        },
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        correo: true,
        telefono: true,
        estado: true,
        debeCambiarPassword: true,
      },
    })

    return { usuario, passwordTemporal }
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ErrorUsuario(409, 'El correo ya está registrado.')
    }

    throw error
  }
}


export type EditarUsuario = {
  nombre: string
  apellido: string
  correo: string
  telefono: string
  rolId: number
}

export async function editarUsuario(
  id: number,
  datos: EditarUsuario,
  directoraId: number,
) {
  const prisma = getPrismaClient()

  if (!Number.isInteger(id) || id <= 0) {
    throw new ErrorUsuario(400, 'ID de usuario inválido.')
  }

  if (id === directoraId) {
    throw new ErrorUsuario(
      403,
      'No puedes modificar tu propia cuenta desde administración.',
    )
  }

  const nombre = datos.nombre.trim()
  const apellido = datos.apellido.trim()
  const correo = datos.correo.trim().toLowerCase()
  const telefono = datos.telefono.trim()

  if (
    !nombre ||
    !apellido ||
    !telefono ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
    !Number.isInteger(datos.rolId)
  ) {
    throw new ErrorUsuario(400, 'Datos inválidos.')
  }

  const [existente, rol] = await Promise.all([
    prisma.usuario.findUnique({ where: { id } }),
    prisma.rol.findFirst({
      where: { id: datos.rolId, activo: true },
    }),
  ])

  if (!existente) {
    throw new ErrorUsuario(404, 'Usuario no encontrado.')
  }

  if (!rol) {
    throw new ErrorUsuario(400, 'Rol no válido.')
  }

  try {
    return await prisma.usuario.update({
      where: { id },
      data: {
        nombre,
        apellido,
        correo,
        telefono,
        roles: {
          deleteMany: {},
          create: {
            rol: { connect: { id: rol.id } },
          },
        },
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        correo: true,
        telefono: true,
        estado: true,
        roles: {
          select: {
            rol: {
              select: { id: true, nombre: true },
            },
          },
        },
      },
    })
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ErrorUsuario(409, 'El correo ya está registrado.')
    }

    throw error
  }
}

export async function cambiarEstadoUsuario(
  id: number,
  estado: 'ACTIVO' | 'INACTIVO',
  directoraId: number,
) {
  const prisma = getPrismaClient()

  if (!Number.isInteger(id) || id <= 0) {
    throw new ErrorUsuario(400, 'ID inválido.')
  }

  if (id === directoraId) {
    throw new ErrorUsuario(
      403,
      'No puedes desactivar o modificar tu propio estado.',
    )
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id },
  })

  if (!usuario) {
    throw new ErrorUsuario(404, 'Usuario no encontrado.')
  }

  return prisma.usuario.update({
    where: { id },
    data: { estado },
    select: {
      id: true,
      nombre: true,
      correo: true,
      estado: true,
    },
  })
}
