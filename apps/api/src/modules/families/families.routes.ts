import { Router } from 'express'
import { getFamilies, getFamily, postFamily } from './families.controller.js'
import { integralFamiliesRouter } from './families-integral.routes.js'

export const familiesRouter = Router()

familiesRouter.get('/', getFamilies)
familiesRouter.post('/', postFamily)
familiesRouter.use(integralFamiliesRouter)
familiesRouter.get('/:id', getFamily)
