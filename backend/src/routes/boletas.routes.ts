import { Router } from 'express'

import { getAuditActor } from '../middleware/audit-actor.js'
import { requirePermission } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as boletasRepo from '../repositories/boletas.repository.js'
import type { CreateBoletaInput, UpdateBoletaInput } from '../types/boleta.js'
import {
  createBoletaSchema,
  listBoletasQuerySchema,
  updateBoletaSchema,
} from '../validators/boleta.validator.js'

export const boletasRouter = Router()

boletasRouter.get(
  '/',
  requirePermission('boletas', 'view'),
  async (req, res, next) => {
    try {
      const query = listBoletasQuerySchema.parse(req.query)
      const result = await boletasRepo.listBoletas({
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        status: query.status,
        paymentMethod: query.paymentMethod,
        companyId: query.companyId,
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

boletasRouter.get(
  '/:id',
  requirePermission('boletas', 'view'),
  async (req, res, next) => {
    try {
      const item = await boletasRepo.getBoletaById(routeParam(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

boletasRouter.post(
  '/',
  requirePermission('boletas', 'create'),
  async (req, res, next) => {
    try {
      const body = createBoletaSchema.parse(req.body) as CreateBoletaInput
      const item = await boletasRepo.createBoleta(body, getAuditActor(req))
      res.status(201).json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

boletasRouter.patch(
  '/:id',
  requirePermission('boletas', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateBoletaSchema.parse(req.body) as UpdateBoletaInput
      const item = await boletasRepo.updateBoleta(
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

boletasRouter.post(
  '/:id/archive',
  requirePermission('boletas', 'delete'),
  async (req, res, next) => {
    try {
      const item = await boletasRepo.archiveBoleta(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

boletasRouter.post(
  '/:id/restore',
  requirePermission('boletas', 'delete'),
  async (req, res, next) => {
    try {
      const item = await boletasRepo.restoreBoleta(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

boletasRouter.post(
  '/:id/printed',
  requirePermission('boletas', 'view'),
  async (req, res, next) => {
    try {
      const item = await boletasRepo.markBoletaPrinted(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

boletasRouter.delete(
  '/:id',
  requirePermission('boletas', 'delete'),
  async (req, res, next) => {
    try {
      await boletasRepo.permanentlyDeleteBoleta(
        routeParam(req),
        getAuditActor(req),
      )
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)
