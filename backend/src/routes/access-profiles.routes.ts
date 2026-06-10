import { Router } from 'express'

import { getAuditActor } from '../middleware/audit-actor.js'
import { requirePermission } from '../middleware/require-permission.js'
import * as profilesRepo from '../repositories/access-profiles.repository.js'
import { routeParam } from '../lib/route-params.js'
import {
  createAccessProfileSchema,
  updateAccessProfileSchema,
} from '../validators/access-profile.validator.js'

export const accessProfilesRouter = Router()

accessProfilesRouter.get(
  '/',
  requirePermission('perfiles', 'view'),
  async (_req, res, next) => {
    try {
      const items = await profilesRepo.listAccessProfiles()
      res.json({ data: items })
    } catch (e) {
      next(e)
    }
  },
)

accessProfilesRouter.get(
  '/:id',
  requirePermission('perfiles', 'view'),
  async (req, res, next) => {
    try {
      const item = await profilesRepo.getAccessProfileById(routeParam(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

accessProfilesRouter.post(
  '/',
  requirePermission('perfiles', 'create'),
  async (req, res, next) => {
    try {
      const body = createAccessProfileSchema.parse(req.body)
      const item = await profilesRepo.createAccessProfile(body)
      res.status(201).json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

accessProfilesRouter.patch(
  '/:id',
  requirePermission('perfiles', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateAccessProfileSchema.parse(req.body)
      const item = await profilesRepo.updateAccessProfile(routeParam(req), body, getAuditActor(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

accessProfilesRouter.delete(
  '/:id',
  requirePermission('perfiles', 'delete'),
  async (req, res, next) => {
    try {
      await profilesRepo.deleteAccessProfile(routeParam(req), getAuditActor(req))
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)
