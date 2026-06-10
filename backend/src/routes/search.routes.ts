import { Router } from 'express'

import { hasElevatedTenantScope } from '../lib/access-profile-admin.js'
import { getAuditActor, getAuthProfile } from '../middleware/audit-actor.js'
import * as searchRepo from '../repositories/search.repository.js'
import { globalSearchQuerySchema } from '../validators/search.validator.js'

export const searchRouter = Router()

searchRouter.get('/', async (req, res, next) => {
  try {
    const query = globalSearchQuerySchema.parse(req.query)
    const profile = getAuthProfile(req)
    const actor = getAuditActor(req)
    const data = await searchRepo.globalSearch(query.q, query.limit, {
      profile,
      memberAccess: hasElevatedTenantScope(profile)
        ? undefined
        : { userId: actor.userId, userName: actor.userName },
    })
    res.json({ data })
  } catch (e) {
    next(e)
  }
})
