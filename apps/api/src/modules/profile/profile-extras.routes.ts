
import express, { Router } from 'express'
import { getPrismaClient } from '../../config/prisma.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { getAuthenticatedUser } from '../auth/auth.service.js'
import { puedeEditarPerfilCompleto } from './profile.permissions.js'
import { DEPARTAMENTOS, MUNICIPIOS_POR_DEPARTAMENTO, municipioValido } from './guatemala-ubicaciones.js'

export const profileExtrasRouter = Router()

// Todas las operaciones requieren una sesión válida.
profileExtrasRouter.use(requireAuth)

async function permitirEdicionCompleta(req: import('express').Request, res: import('express').Response): Promise<boolean> {
  const usuario = await getAuthenticatedUser(req.session.userId!)
  if (!usuario || !puedeEditarPerfilCompleto(usuario.roles)) {
    res.status(403).json({ error: { message: 'No tienes permiso para cambiar esos datos.' } })
    return false
  }
  return true
}

// Catálogo de ubicación independiente de los municipios sintéticos de pruebas.
profileExtrasRouter.get('/ubicaciones', (_req, res) => {
  res.setHeader('Cache-Control', 'private, max-age=86400')
  res.json({ departamentos: DEPARTAMENTOS, municipiosPorDepartamento: MUNICIPIOS_POR_DEPARTAMENTO })
})

// =====================================================
// EDITAR DIRECCIÓN DEL USUARIO
// =====================================================

profileExtrasRouter.patch('/direccion', async (req, res, next) => {
  try {
    if (!await permitirEdicionCompleta(req, res)) return
    const datos: unknown = req.body

    if (
      !datos ||
      typeof datos !== 'object' ||
      Array.isArray(datos)
    ) {
      res.status(400).json({
        error: {
          message: 'Los datos de dirección no son válidos.',
        },
      })
      return
    }

    const body = datos as Record<string, unknown>
    const permitidos = ['departamento', 'municipio', 'direccion']

    if (
      Object.keys(body).some((campo) => !permitidos.includes(campo)) ||
      permitidos.some((campo) => !(campo in body))
    ) {
      res.status(400).json({
        error: {
          message: 'Solo puedes modificar los campos de dirección.',
        },
      })
      return
    }

    for (const campo of permitidos) {
      if (body[campo] !== null && typeof body[campo] !== 'string') {
        res.status(400).json({
          error: { message: 'Los valores de dirección no son válidos.' },
        })
        return
      }
    }

    const departamento = (body.departamento as string | null)?.trim() ?? ''
    const municipio = (body.municipio as string | null)?.trim() ?? ''
    const direccion = (body.direccion as string | null)?.trim() ?? ''

    if (
      departamento.length > 100 ||
      municipio.length > 100 ||
      direccion.length > 255
    ) {
      res.status(400).json({
        error: {
          message: 'Uno o más campos superan la longitud permitida.',
        },
      })
      return
    }

    if ((departamento || municipio) && (!departamento || !municipio || !municipioValido(departamento, municipio))) {
      res.status(400).json({ error: { message: 'Selecciona un municipio del departamento indicado.' } })
      return
    }

    const usuarioId = req.session.userId!

    await getPrismaClient().usuario.update({
      where: { id: usuarioId },
      data: {
        departamento: departamento || null,
        municipio: municipio || null,
        direccion: direccion || null,
      },
    })

    const usuario = await getAuthenticatedUser(usuarioId)

    res.json({
      message: 'Dirección actualizada correctamente.',
      usuario,
    })
  } catch (error) {
    next(error)
  }
})

// =====================================================
// CONSULTAR FOTOGRAFÍA DE PERFIL
// =====================================================

profileExtrasRouter.get('/foto', async (req, res, next) => {
  try {
    const foto = await getPrismaClient().usuarioFotoPerfil.findUnique({
      where: { usuarioId: req.session.userId! },
    })

    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')

    if (!foto) {
      res.status(404).json({
        error: { message: 'No hay fotografía registrada.' },
      })
      return
    }

    res.setHeader('Content-Type', foto.mimeType)
    res.send(Buffer.from(foto.contenido))
  } catch (error) {
    next(error)
  }
})

// =====================================================
// SUBIR O REEMPLAZAR FOTOGRAFÍA
// =====================================================

profileExtrasRouter.put(
  '/foto',
  express.raw({
    type: () => true,
    limit: '2mb',
  }),
  async (req, res, next) => {
    try {
      const archivo: unknown = req.body
      const mimeType = req.headers['content-type']
        ?.split(';')[0]
        ?.trim()
        .toLowerCase()

      if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
        res.status(415).json({
          error: { message: 'Solo se permiten fotografías JPG o PNG.' },
        })
        return
      }

      if (!Buffer.isBuffer(archivo) || archivo.length === 0) {
        res.status(400).json({
          error: { message: 'Debes seleccionar una fotografía válida.' },
        })
        return
      }

      if (archivo.length > 2 * 1024 * 1024) {
        res.status(413).json({
          error: { message: 'La fotografía no puede superar los 2 MB.' },
        })
        return
      }

      // Verificar la firma real del archivo.
      const esPng =
        archivo.length >= 24 &&
        archivo.subarray(0, 8).equals(
          Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
        ) &&
        archivo.toString('ascii', 12, 16) === 'IHDR'

      const esJpeg =
        archivo.length >= 4 &&
        archivo[0] === 0xff &&
        archivo[1] === 0xd8 &&
        archivo[2] === 0xff &&
        archivo[archivo.length - 2] === 0xff &&
        archivo[archivo.length - 1] === 0xd9

      if (
        (mimeType === 'image/png' && !esPng) ||
        (mimeType === 'image/jpeg' && !esJpeg)
      ) {
        res.status(400).json({
          error: { message: 'El contenido de la fotografía no es válido.' },
        })
        return
      }

      const usuarioId = req.session.userId!

      await getPrismaClient().usuarioFotoPerfil.upsert({
        where: { usuarioId },
        create: {
          usuarioId,
          mimeType,
          contenido: new Uint8Array(archivo),
        },
        update: {
          mimeType,
          contenido: new Uint8Array(archivo),
          actualizadaEn: new Date(),
        },
      })

      res.json({
        message: 'Fotografía actualizada correctamente.',
      })
    } catch (error) {
      next(error)
    }
  }
)



profileExtrasRouter.delete('/foto', async (req, res, next) => {
  try {
    await getPrismaClient().usuarioFotoPerfil.deleteMany({
      where: { usuarioId: req.session.userId! },
    })

    res.json({
      message: 'Fotografía eliminada correctamente.',
    })
  } catch (error) {
    next(error)
  }
})
