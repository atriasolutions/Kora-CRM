import { Router } from 'express'

import * as searchRepo from '../repositories/search.repository.js'
import { globalSearchQuerySchema } from '../validators/search.validator.js'

export const searchRouter = Router()

searchRouter.get('/', async (req, res, next) => {
  try {
    const query = globalSearchQuerySchema.parse(req.query)
    const data = await searchRepo.globalSearch(query.q, query.limit)
    res.json({ data })
  } catch (e) {
    next(e)
  }
})
