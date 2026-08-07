import { Router } from 'express'

import { hasElevatedTenantScope, isGuestAccessProfile } from '../lib/access-profile-admin.js'
import { getAuditActor, getAuthProfile } from '../middleware/audit-actor.js'
import { forbidden } from '../middleware/errors.js'
import { requirePermission } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as pruebasRepo from '../repositories/solicitud-pruebas.repository.js'
import {
  clientReviewPruebaCasoSchema,
  createPruebaSolicitudSchema,
  listPruebasSolicitudQuerySchema,
  updatePruebaCasosSchema,
  updatePruebaSolicitudSchema,
} from '../validators/solicitud-prueba.validator.js'

export const solicitudPruebasRouter = Router()

solicitudPruebasRouter.get(
  '/',
  requirePermission('pruebas_solicitud', 'view'),
  async (req, res, next) => {
    try {
      const query = listPruebasSolicitudQuerySchema.parse(req.query)
      const profile = getAuthProfile(req)
      const actor = getAuditActor(req)
      const result = await pruebasRepo.listPruebasSolicitud({
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        solicitudId: query.solicitudId,
        companyId: query.companyId,
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

solicitudPruebasRouter.get(
  '/:id',
  requirePermission('pruebas_solicitud', 'view'),
  async (req, res, next) => {
    try {
      const profile = getAuthProfile(req)
      const actor = getAuditActor(req)
      const item = await pruebasRepo.getPruebaSolicitudById(routeParam(req))
      if (!hasElevatedTenantScope(profile) && !actor.isPlatformOperator) {
        await pruebasRepo.assertPruebaSolicitudAccess(item.id, actor)
      }
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

solicitudPruebasRouter.post(
  '/',
  requirePermission('pruebas_solicitud', 'create'),
  async (req, res, next) => {
    try {
      const profile = getAuthProfile(req)
      if (isGuestAccessProfile(profile)) {
        throw forbidden('Los invitados no pueden crear pruebas de solicitud.')
      }
      const body = createPruebaSolicitudSchema.parse(req.body)
      const actor = getAuditActor(req)
      const created = await pruebasRepo.createPruebaSolicitud(body, actor)
      res.status(201).json({ data: created })
    } catch (e) {
      next(e)
    }
  },
)

solicitudPruebasRouter.patch(
  '/:id',
  requirePermission('pruebas_solicitud', 'edit'),
  async (req, res, next) => {
    try {
      const profile = getAuthProfile(req)
      if (isGuestAccessProfile(profile)) {
        throw forbidden('Los invitados no pueden editar la cabecera de la prueba.')
      }
      const body = updatePruebaSolicitudSchema.parse(req.body)
      const actor = getAuditActor(req)
      const updated = await pruebasRepo.updatePruebaSolicitud(routeParam(req), body, actor)
      res.json({ data: updated })
    } catch (e) {
      next(e)
    }
  },
)

solicitudPruebasRouter.patch(
  '/:id/casos',
  requirePermission('pruebas_solicitud', 'edit'),
  async (req, res, next) => {
    try {
      const profile = getAuthProfile(req)
      if (isGuestAccessProfile(profile)) {
        throw forbidden('Los invitados no pueden editar los casos de prueba.')
      }
      const body = updatePruebaCasosSchema.parse(req.body)
      const actor = getAuditActor(req)
      const updated = await pruebasRepo.updatePruebaCasos(routeParam(req), body, actor)
      res.json({ data: updated })
    } catch (e) {
      next(e)
    }
  },
)

solicitudPruebasRouter.patch(
  '/:id/casos/:casoId/client-review',
  requirePermission('pruebas_solicitud', 'edit'),
  async (req, res, next) => {
    try {
      const body = clientReviewPruebaCasoSchema.parse(req.body)
      const actor = getAuditActor(req)
      const updated = await pruebasRepo.clientReviewPruebaCaso(
        routeParam(req),
        routeParam(req, 'casoId'),
        body,
        actor,
      )
      res.json({ data: updated })
    } catch (e) {
      next(e)
    }
  },
)

solicitudPruebasRouter.post(
  '/:id/archive',
  requirePermission('pruebas_solicitud', 'delete'),
  async (req, res, next) => {
    try {
      const profile = getAuthProfile(req)
      if (isGuestAccessProfile(profile)) {
        throw forbidden('Los invitados no pueden archivar pruebas.')
      }
      const actor = getAuditActor(req)
      const updated = await pruebasRepo.archivePruebaSolicitud(routeParam(req), actor)
      res.json({ data: updated })
    } catch (e) {
      next(e)
    }
  },
)

solicitudPruebasRouter.post(
  '/:id/restore',
  requirePermission('pruebas_solicitud', 'delete'),
  async (req, res, next) => {
    try {
      const profile = getAuthProfile(req)
      if (isGuestAccessProfile(profile)) {
        throw forbidden('Los invitados no pueden restaurar pruebas.')
      }
      const actor = getAuditActor(req)
      const updated = await pruebasRepo.restorePruebaSolicitud(routeParam(req), actor)
      res.json({ data: updated })
    } catch (e) {
      next(e)
    }
  },
)

solicitudPruebasRouter.delete(
  '/:id',
  requirePermission('pruebas_solicitud', 'delete'),
  async (req, res, next) => {
    try {
      const profile = getAuthProfile(req)
      if (isGuestAccessProfile(profile)) {
        throw forbidden('Los invitados no pueden eliminar pruebas.')
      }
      const actor = getAuditActor(req)
      await pruebasRepo.deletePruebaSolicitudPermanent(routeParam(req), actor)
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)
