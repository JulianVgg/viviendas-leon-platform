/**
 * One-time first administrator creation for a new production database.
 * Run manually from the deployed API service, never as part of migrations.
 * Does not print credentials or modify existing users.
 */
import argon2 from 'argon2'
import { getPrismaClient } from '../config/prisma.js'

async function main() {
  const correo = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD
  const nombre = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'Administración'

  if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    throw new Error('Configura BOOTSTRAP_ADMIN_EMAIL con un correo válido.')
  }
  if (!password || password.length < 16) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD debe tener al menos 16 caracteres.')
  }

  const prisma = getPrismaClient()
  try {
    if (await prisma.usuario.count()) {
      throw new Error('La base ya tiene usuarios: no se creará otro administrador.')
    }

    const rol = await prisma.rol.findUnique({
      where: { nombre: 'Dirección general' },
    })
    if (!rol || !rol.activo) {
      throw new Error('No existe el rol activo Dirección general. Ejecuta las migraciones.')
    }

    const passwordHash = await argon2.hash(password)
    await prisma.usuario.create({
      data: {
        nombre,
        correo,
        passwordHash,
        debeCambiarPassword: true,
        estado: 'ACTIVO',
        fechaCreacion: new Date(),
        roles: { create: { rol: { connect: { id: rol.id } } } },
      },
    })
    console.log('Primer administrador creado. Inicia sesión y cambia la contraseña.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'No se pudo crear el administrador.')
  process.exitCode = 1
})
