import { Router } from 'express'
import { getFamilies, getFamily, postFamily } from './families.controller.js'
import { integralFamiliesRouter } from './families-integral.routes.js'
import { patchFamily, patchFamilyMember, patchFamilyMemberState, postFamilyMember } from './families-management.controller.js'
import { patchFamilyProgram, postFamilyProgram } from './family-programs.controller.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requireFamilyWrite } from './families.authorization.js'
import { patchFamilyBatch } from './family-batch.controller.js'
import { familyPhotoRouter } from './family-photo.routes.js'
import { getFamilyCoordinates } from './family-coordinates.controller.js'

export const familiesRouter = Router()

const familyWrite = [requireAuth, requireFamilyWrite]
const familyRead = [requireAuth]

familiesRouter.get('/', ...familyRead, getFamilies)
familiesRouter.post('/', ...familyWrite, postFamily)
familiesRouter.use(integralFamiliesRouter)
familiesRouter.use(familyPhotoRouter)
familiesRouter.patch('/:id/expediente-completo', ...familyWrite, patchFamilyBatch)
familiesRouter.post('/:id/programas', ...familyWrite, postFamilyProgram)
familiesRouter.patch('/:id/programas/:participacionId', ...familyWrite, patchFamilyProgram)
familiesRouter.get('/:id/ubicacion', ...familyWrite, getFamilyCoordinates)
familiesRouter.patch('/:id', ...familyWrite, patchFamily)
familiesRouter.post('/:id/integrantes', ...familyWrite, postFamilyMember)
familiesRouter.patch('/:id/integrantes/:integranteId/estado', ...familyWrite, patchFamilyMemberState)
familiesRouter.patch('/:id/integrantes/:integranteId', ...familyWrite, patchFamilyMember)
familiesRouter.get('/:id', ...familyRead, getFamily)
