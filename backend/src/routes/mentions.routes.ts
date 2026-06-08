import { Router } from 'express'

import { requireMentionLookup } from '../middleware/require-permission.js'
import { searchMentions } from '../repositories/mentions.repository.js'
import { mentionSearchQuerySchema } from '../validators/mentions.validator.js'

export const mentionsRouter = Router()

mentionsRouter.get(
  '/',
  requireMentionLookup(),
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
