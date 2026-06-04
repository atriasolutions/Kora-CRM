import { Router } from 'express'

import {
  createEntityNoteForRequest,
  deleteEntityNoteForRequest,
  getEntityNotesForRequest,
} from '../services/entity-notes.service.js'
import {
  createEntityNoteSchema,
  listEntityNotesQuerySchema,
} from '../validators/entity-notes.validator.js'
import { routeParam } from '../lib/route-params.js'

export const entityNotesRouter = Router()

entityNotesRouter.get('/', async (req, res, next) => {
  try {
    const query = listEntityNotesQuerySchema.parse(req.query)
    const data = await getEntityNotesForRequest(
      req,
      query.entityType,
      query.entityId,
    )
    res.json({ data })
  } catch (error) {
    next(error)
  }
})

entityNotesRouter.post('/', async (req, res, next) => {
  try {
    const body = createEntityNoteSchema.parse(req.body)
    const data = await createEntityNoteForRequest(req, body)
    res.status(201).json({ data })
  } catch (error) {
    next(error)
  }
})

entityNotesRouter.delete('/:id', async (req, res, next) => {
  try {
    await deleteEntityNoteForRequest(req, routeParam(req))
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})
