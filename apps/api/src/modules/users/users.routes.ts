
import { Router } from 'express'

import {
  consultarRoles,
  registrarUsuario,
} from './users.controller.js'

import {
  actualizarUsuario,
  actualizarEstadoUsuario,
} from './users.controller.js'

import { requirePermission } from '../auth/require-permission.middleware.js'
import { protectDirectorAccounts } from './protect-director-accounts.middleware.js'

import { obtenerUsuarios } from
  './users.controller.js'

export const usersRouter = Router()


usersRouter.use(
  requirePermission('PANTALLA_USUARIOS'),
  protectDirectorAccounts,
)


usersRouter.get('/', obtenerUsuarios)

usersRouter.get('/roles', consultarRoles)
usersRouter.post('/', registrarUsuario)

usersRouter.put('/:id', actualizarUsuario)
usersRouter.patch('/:id/estado', actualizarEstadoUsuario)