import { Router } from 'express'

import { requirePermission } from '../middleware/require-permission.js'
import { searchMentions } from '../repositories/mentions.repository.js'
import { mentionSearchQuerySchema } from '../validators/mentions.validator.js'

export const mentionsRouter = Router()

mentionsRouter.get(
  '/',
  requirePermission('contactos', 'view'),
  async (req, res, next) => {
    try {
      const query = mentionSearchQuerySchema.parse(req.query)
      const data = await searchMentions(query.q, query.limit)
      res.json({ data })
    } catch (e) {
      next(e)
    }
  },
)
