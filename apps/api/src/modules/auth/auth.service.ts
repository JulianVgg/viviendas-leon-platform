
import argon2 from 'argon2'
import { getPrismaClient } from '../../config/prisma.js'

export type AuthenticatedUser = {
  id: number
  nombre: string
  apellido: string | null
  telefono: string | null
  correo: string

  // Dirección del usuario
  departamento: string | null
  municipio: string | null
  direccion: string | null

  roles: string[]
  permisos: string[]
  debeCambiarPassword: boolean
}

export async function validateCredentials(
  correo: string,
  password: string,
): Promise<AuthenticatedUser | null> {
  const prisma = getPrismaClient()

  const email = correo.trim().toLowerCase()

  const usuario = await prisma.usuario.findUnique({
    where: { correo: email },
    include: {
      roles: {
        include: {
          rol: {
            include: {
              permisos: {
                include: {
                  permiso: true,
                },
              },
            },
          },
        },
      },
    },
  })

  // Nunca mostrar si el correo existe o no.
  if (!usuario || usuario.estado !== 'ACTIVO') {
    return null
  }

  let validPassword = false

  try {
    validPassword = await argon2.verify(
      usuario.passwordHash,
      password,
    )
  } catch {
    return null
  }

  if (!validPassword) {
    return null
  }

  const activeRoles = usuario.roles
    .map((item) => item.rol)
    .filter((rol) => rol.activo)

  const roles = activeRoles.map((rol) => rol.nombre)

  const permisos = [
    ...new Set(
      activeRoles.flatMap((rol) =>
        rol.permisos.map((item) => item.permiso.codigo),
      ),
    ),
  ]

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ultimoAcceso: new Date() },
  })

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    telefono: usuario.telefono,
    correo: usuario.correo,

    departamento: usuario.departamento,
    municipio: usuario.municipio,
    direccion: usuario.direccion,

    roles,
    permisos,
    debeCambiarPassword: usuario.debeCambiarPassword,
  }
}

export async function getAuthenticatedUser(
  userId: number,
): Promise<AuthenticatedUser | null> {
  const prisma = getPrismaClient()

  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          rol: {
            include: {
              permisos: {
                include: {
                  permiso: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!usuario || usuario.estado !== 'ACTIVO') {
    return null
  }

  const activeRoles = usuario.roles
    .map((item) => item.rol)
    .filter((rol) => rol.activo)

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    telefono: usuario.telefono,
    correo: usuario.correo,

    departamento: usuario.departamento,
    municipio: usuario.municipio,
    direccion: usuario.direccion,

    roles: activeRoles.map((rol) => rol.nombre),
    permisos: [
      ...new Set(
        activeRoles.flatMap((rol) =>
          rol.permisos.map((item) => item.permiso.codigo),
        ),
      ),
    ],
    debeCambiarPassword: usuario.debeCambiarPassword,
  }
}

export async function cambiarPassword(
  usuarioId: number,
  passwordActual: string,
  passwordNueva: string,
) {
  const prisma = getPrismaClient()

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
  })

  if (!usuario || usuario.estado !== 'ACTIVO') {
    throw new Error('Usuario no disponible.')
  }

  const passwordValida = await argon2.verify(
    usuario.passwordHash,
    passwordActual,
  )

  if (!passwordValida) {
    throw new Error('La contraseña actual es incorrecta.')
  }

  if (
    passwordNueva.length < 12 ||
    passwordNueva.length > 128
  ) {
    throw new Error(
      'La contraseña debe contener entre 12 y 128 caracteres.',
    )
  }

  if (passwordActual === passwordNueva) {
    throw new Error(
      'La nueva contraseña debe ser diferente a la actual.'
    )
  }

  const nuevoHash = await argon2.hash(passwordNueva)

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      passwordHash: nuevoHash,
      debeCambiarPassword: false,
    },
  })
}
