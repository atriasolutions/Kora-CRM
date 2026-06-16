import { Router } from 'express'

import { parseDashboardPeriodQuery } from '../lib/dashboard-period.js'
import * as dashboardRepo from '../repositories/dashboard.repository.js'
import { dashboardQuerySchema } from '../validators/dashboard.validator.js'

export const dashboardRouter = Router()

dashboardRouter.get('/', async (req, res, next) => {
  try {
    const query = dashboardQuerySchema.parse(req.query)
    const period = parseDashboardPeriodQuery(query)
    const view = query.view ?? 'ventas'
    const data = await dashboardRepo.getDashboardSnapshot(period, view)
    res.json({ data })
  } catch (e) {
    next(e)
  }
})
