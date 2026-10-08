import { Router } from 'express'
import { getFamilies } from './families.controller.js'

export const familiesRouter = Router()

familiesRouter.get('/', getFamilies)
