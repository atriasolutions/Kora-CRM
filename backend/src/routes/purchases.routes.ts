import { Router } from 'express'

import { getAuditActor } from '../middleware/audit-actor.js'
import { requirePermission } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as purchasesRepo from '../repositories/purchases.repository.js'
import type {
  CreatePurchaseInput,
  UpdatePurchaseInput,
} from '../types/purchase.js'
import {
  createPurchaseSchema,
  listPurchasesQuerySchema,
  updatePurchaseSchema,
} from '../validators/purchase.validator.js'

export const purchasesRouter = Router()

purchasesRouter.get(
  '/',
  requirePermission('compras', 'view'),
  async (req, res, next) => {
    try {
      const query = listPurchasesQuerySchema.parse(req.query)
      const result = await purchasesRepo.listPurchases({
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        status: query.status,
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

purchasesRouter.get(
  '/:id',
  requirePermission('compras', 'view'),
  async (req, res, next) => {
    try {
      const item = await purchasesRepo.getPurchaseById(routeParam(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

purchasesRouter.post(
  '/',
  requirePermission('compras', 'create'),
  async (req, res, next) => {
    try {
      const body = createPurchaseSchema.parse(req.body) as CreatePurchaseInput
      const item = await purchasesRepo.createPurchase(body, getAuditActor(req))
      res.status(201).json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

purchasesRouter.patch(
  '/:id',
  requirePermission('compras', 'edit'),
  async (req, res, next) => {
    try {
      const body = updatePurchaseSchema.parse(req.body) as UpdatePurchaseInput
      const item = await purchasesRepo.updatePurchase(
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

purchasesRouter.post(
  '/:id/archive',
  requirePermission('compras', 'delete'),
  async (req, res, next) => {
    try {
      const item = await purchasesRepo.archivePurchase(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

purchasesRouter.post(
  '/:id/restore',
  requirePermission('compras', 'delete'),
  async (req, res, next) => {
    try {
      const item = await purchasesRepo.restorePurchase(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

purchasesRouter.delete(
  '/:id',
  requirePermission('compras', 'delete'),
  async (req, res, next) => {
    try {
      await purchasesRepo.permanentlyDeletePurchase(routeParam(req))
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)
