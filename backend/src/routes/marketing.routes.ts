import { Router } from 'express'

import * as marketingLead from '../services/marketing-lead.service.js'
import { supportRequestSchema, trialLeadSchema } from '../validators/marketing.validator.js'

export const marketingRouter = Router()

marketingRouter.post('/trial-lead', async (req, res, next) => {
  try {
    const body = trialLeadSchema.parse(req.body)
    const result = await marketingLead.submitTrialLead(body)
    res.status(201).json({ data: result })
  } catch (e) {
    next(e)
  }
})

marketingRouter.post('/support-request', async (req, res, next) => {
  try {
    const body = supportRequestSchema.parse(req.body)
    const result = await marketingLead.submitSupportRequest(body)
    res.status(201).json({ data: result })
  } catch (e) {
    next(e)
  }
})
