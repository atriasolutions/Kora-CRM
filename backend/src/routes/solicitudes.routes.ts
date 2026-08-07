import { Router } from 'express'

import { hasElevatedTenantScope } from '../lib/access-profile-admin.js'
import { getAuditActor, getAuthProfile } from '../middleware/audit-actor.js'
import { requirePermission } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as solicitudesRepo from '../repositories/solicitudes.repository.js'
import type {
  CreateSolicitudInput,
  UpdateSolicitudInput,
} from '../types/solicitud.js'
import {
  createSolicitudSchema,
  listSolicitudesQuerySchema,
  updateSolicitudSchema,
} from '../validators/solicitud.validator.js'

export const solicitudesRouter = Router()

solicitudesRouter.get(
  '/',
  requirePermission('solicitudes', 'view'),
  async (req, res, next) => {
    try {
      const query = listSolicitudesQuerySchema.parse(req.query)
      const profile = getAuthProfile(req)
      const actor = getAuditActor(req)
      const result = await solicitudesRepo.listSolicitudes({
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        status: query.status,
        archivedOnly: query.archived === true,
        memberAccess:
          hasElevatedTenantScope(profile) || actor.isPlatformOperator
            ? undefined
            : { userId: actor.userId, userName: actor.userName },
        sortBy: query.sortBy,
        sortDir: query.sortDir,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
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

solicitudesRouter.get(
  '/:id',
  requirePermission('solicitudes', 'view'),
  async (req, res, next) => {
    try {
      const profile = getAuthProfile(req)
      const actor = getAuditActor(req)
      const item = await solicitudesRepo.getSolicitudById(routeParam(req))
      if (!hasElevatedTenantScope(profile) && !actor.isPlatformOperator) {
        solicitudesRepo.assertSolicitudTeamAccess(
          item.assignee,
          item.team,
          actor,
          { userId: item.createdById, userName: item.createdByName },
          item.assigneeUserId ?? null,
        )
      }
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

solicitudesRouter.post(
  '/',
  requirePermission('solicitudes', 'create'),
  async (req, res, next) => {
    try {
      const body = createSolicitudSchema.parse(req.body) as CreateSolicitudInput
      const item = await solicitudesRepo.createSolicitud(body, getAuditActor(req))
      res.status(201).json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

solicitudesRouter.patch(
  '/:id',
  requirePermission('solicitudes', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateSolicitudSchema.parse(req.body) as UpdateSolicitudInput
      const item = await solicitudesRepo.updateSolicitud(
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

solicitudesRouter.post(
  '/:id/archive',
  requirePermission('solicitudes', 'delete'),
  async (req, res, next) => {
    try {
      const item = await solicitudesRepo.archiveSolicitud(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

solicitudesRouter.post(
  '/:id/restore',
  requirePermission('solicitudes', 'delete'),
  async (req, res, next) => {
    try {
      const item = await solicitudesRepo.restoreSolicitud(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

solicitudesRouter.delete(
  '/:id',
  requirePermission('solicitudes', 'delete'),
  async (req, res, next) => {
    try {
      await solicitudesRepo.permanentlyDeleteSolicitud(routeParam(req))
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)
