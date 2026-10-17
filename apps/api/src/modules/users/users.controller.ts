
import type {
  Request,
  Response,
  NextFunction,
} from 'express'

import {
  crearUsuario,
  obtenerRolesDisponibles,
  ErrorUsuario,
} from './users.service.js'

import {
  editarUsuario,
  cambiarEstadoUsuario,
} from './users.service.js'

import { listarUsuarios } from './users.service.js'

export async function obtenerUsuarios(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const usuarios = await listarUsuarios()

    res.status(200).json({
      usuarios,
    })
  } catch (error) {
    next(error)
  }
}


export async function consultarRoles(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const roles = await obtenerRolesDisponibles()
    res.status(200).json({ roles })
  } catch (error) {
    next(error)
  }
}

export async function registrarUsuario(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const datos = req.body

    if (
      !datos ||
      typeof datos.nombre !== 'string' ||
      typeof datos.apellido !== 'string' ||
      typeof datos.correo !== 'string' ||
      typeof datos.telefono !== 'string' ||
      !Number.isInteger(datos.rolId)
    ) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Completa correctamente todos los campos.',
        },
      })
      return
    }

    const resultado = await crearUsuario(datos)

    res.status(201).json({
      message: 'Usuario registrado correctamente.',
      ...resultado,
    })
  } catch (error) {
    if (error instanceof ErrorUsuario) {
      res.status(error.status).json({
        error: {
          code: 'USER_ERROR',
          message: error.message,
        },
      })
      return
    }

    next(error)
  }
}


export async function actualizarUsuario(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Number(req.params.id)
    const directoraId = req.session.userId
    const datos = req.body

    if (
      !directoraId ||
      !datos ||
      typeof datos.nombre !== 'string' ||
      typeof datos.apellido !== 'string' ||
      typeof datos.correo !== 'string' ||
      typeof datos.telefono !== 'string' ||
      !Number.isInteger(datos.rolId)
    ) {
      res.status(400).json({
        error: {
          message: 'Datos de usuario inválidos.',
        },
      })
      return
    }

    const usuario = await editarUsuario(
      id, datos, directoraId,
    )

    res.status(200).json({
      message: 'Usuario actualizado correctamente.',
      usuario,
    })
  } catch (error) {
    if (error instanceof ErrorUsuario) {
      res.status(error.status).json({
        error: { message: error.message },
      })
      return
    }

    next(error)
  }
}

export async function actualizarEstadoUsuario(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Number(req.params.id)
    const directoraId = req.session.userId
    const estado = req.body?.estado

    if (
      !directoraId ||
      (estado !== 'ACTIVO' && estado !== 'INACTIVO')
    ) {
      res.status(400).json({
        error: {
          message: 'Estado inválido.',
        },
      })
      return
    }

    const usuario = await cambiarEstadoUsuario(
      id, estado, directoraId,
    )

    res.status(200).json({
      message: 'Estado actualizado correctamente.',
      usuario,
    })
  } catch (error) {
    if (error instanceof ErrorUsuario) {
      res.status(error.status).json({
        error: { message: error.message },
      })
      return
    }

    next(error)
  }
}