import { Router } from 'express'
import { getFamilies, getFamily, postFamily } from './families.controller.js'

export const familiesRouter = Router()

familiesRouter.get('/', getFamilies)
familiesRouter.post('/', postFamily)
familiesRouter.get('/:id', getFamily)
