
import argon2 from 'argon2'
import { getPrismaClient } from '../../config/prisma.js'

export type AuthenticatedUser = {
  id: number
  nombre: string
  correo: string
  roles: string[]
  permisos: string[]
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
    correo: usuario.correo,
    roles,
    permisos,
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
    correo: usuario.correo,
    roles: activeRoles.map((rol) => rol.nombre),
    permisos: [
      ...new Set(
        activeRoles.flatMap((rol) =>
          rol.permisos.map((item) => item.permiso.codigo),
        ),
      ),
    ],
  }
}
