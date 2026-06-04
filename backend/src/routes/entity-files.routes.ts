import { Router } from 'express'

import {
  getEntityFilesForRequest,
  syncEntityFilesForRequest,
} from '../services/entity-files.service.js'
import {
  listEntityFilesQuerySchema,
  syncEntityFilesSchema,
} from '../validators/entity-files.validator.js'

export const entityFilesRouter = Router()

entityFilesRouter.get('/', async (req, res, next) => {
  try {
    const query = listEntityFilesQuerySchema.parse(req.query)
    const data = await getEntityFilesForRequest(
      req,
      query.entityType,
      query.entityId,
    )
    res.json({ data })
  } catch (error) {
    next(error)
  }
})

entityFilesRouter.put('/sync', async (req, res, next) => {
  try {
    const body = syncEntityFilesSchema.parse(req.body)
    const data = await syncEntityFilesForRequest(req, body)
    res.json({ data })
  } catch (error) {
    next(error)
  }
})
