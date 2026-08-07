import { Router } from 'express'

import { getAuditActor } from '../middleware/audit-actor.js'
import { requirePermission } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as activitiesRepo from '../repositories/activities.repository.js'
import type {
  CreateActivityInput,
  UpdateActivityInput,
} from '../types/activity.js'
import {
  createActivitySchema,
  listActivitiesQuerySchema,
  updateActivitySchema,
} from '../validators/activity.validator.js'

export const activitiesRouter = Router()

activitiesRouter.get(
  '/',
  requirePermission('actividades', 'view'),
  async (req, res, next) => {
    try {
      const query = listActivitiesQuerySchema.parse(req.query)
      const result = await activitiesRepo.listActivities({
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        status: query.status,
        relatedType: query.relatedType,
        relatedId: query.relatedId,
        assigneeName: query.assigneeName,
        sortBy: query.sortBy,
        sortDir: query.sortDir,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        archivedOnly: query.archived === true,
      })
      res.json({
        data: result.items,
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / query.pageSize) || 1,
        },
      })
    } catch (e) {
      next(e)
    }
  },
)

activitiesRouter.get(
  '/related/:relatedType/:relatedId',
  requirePermission('actividades', 'view'),
  async (req, res, next) => {
    try {
      const items = await activitiesRepo.listActivitiesForRelated(
        routeParam(req, 'relatedType'),
        routeParam(req, 'relatedId'),
      )
      res.json({ data: items })
    } catch (e) {
      next(e)
    }
  },
)

activitiesRouter.get(
  '/:id',
  requirePermission('actividades', 'view'),
  async (req, res, next) => {
    try {
      const item = await activitiesRepo.getActivityById(routeParam(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

activitiesRouter.post(
  '/',
  requirePermission('actividades', 'create'),
  async (req, res, next) => {
    try {
      const body = createActivitySchema.parse(req.body) as CreateActivityInput
      const item = await activitiesRepo.createActivity(body, getAuditActor(req))
      res.status(201).json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

activitiesRouter.patch(
  '/:id',
  requirePermission('actividades', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateActivitySchema.parse(req.body) as UpdateActivityInput
      const item = await activitiesRepo.updateActivity(
        routeParam(req),
        body,
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

activitiesRouter.post(
  '/:id/archive',
  requirePermission('actividades', 'delete'),
  async (req, res, next) => {
    try {
      const item = await activitiesRepo.archiveActivity(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

activitiesRouter.post(
  '/:id/restore',
  requirePermission('actividades', 'delete'),
  async (req, res, next) => {
    try {
      const item = await activitiesRepo.restoreActivity(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

activitiesRouter.delete(
  '/:id',
  requirePermission('actividades', 'delete'),
  async (req, res, next) => {
    try {
      await activitiesRepo.permanentlyDeleteActivity(routeParam(req))
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)
