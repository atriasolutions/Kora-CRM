import { Router } from 'express'

import * as geoRepo from '../repositories/geo.repository.js'

export const geoRouter = Router()

geoRouter.get('/chile', async (_req, res, next) => {
  try {
    const data = await geoRepo.getGeoCatalog()
    res.json({ data })
  } catch (e) {
    next(e)
  }
})
