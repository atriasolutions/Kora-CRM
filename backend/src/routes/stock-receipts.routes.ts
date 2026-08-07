import { Router } from 'express'

import { getAuditActor } from '../middleware/audit-actor.js'
import { requirePermission } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as receiptsRepo from '../repositories/stock-receipts.repository.js'
import {
  createStockReceiptSchema,
  listStockReceiptsQuerySchema,
  updateStockReceiptSchema,
} from '../validators/stock-receipt.validator.js'

export const stockReceiptsRouter = Router()

stockReceiptsRouter.get(
  '/',
  requirePermission('ingresos', 'view'),
  async (req, res, next) => {
    try {
      const query = listStockReceiptsQuerySchema.parse(req.query)
      const result = await receiptsRepo.listStockReceipts({
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        status: query.status,
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

stockReceiptsRouter.get(
  '/:id',
  requirePermission('ingresos', 'view'),
  async (req, res, next) => {
    try {
      const item = await receiptsRepo.getStockReceiptById(routeParam(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

stockReceiptsRouter.post(
  '/',
  requirePermission('ingresos', 'create'),
  async (req, res, next) => {
    try {
      const body = createStockReceiptSchema.parse(req.body)
      const item = await receiptsRepo.createStockReceipt(body, getAuditActor(req))
      res.status(201).json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

stockReceiptsRouter.patch(
  '/:id',
  requirePermission('ingresos', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateStockReceiptSchema.parse(req.body)
      const item = await receiptsRepo.updateStockReceipt(
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

stockReceiptsRouter.post(
  '/:id/confirm',
  requirePermission('ingresos', 'edit'),
  async (req, res, next) => {
    try {
      const item = await receiptsRepo.confirmStockReceipt(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

stockReceiptsRouter.post(
  '/:id/archive',
  requirePermission('ingresos', 'delete'),
  async (req, res, next) => {
    try {
      const item = await receiptsRepo.archiveStockReceipt(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

stockReceiptsRouter.post(
  '/:id/restore',
  requirePermission('ingresos', 'delete'),
  async (req, res, next) => {
    try {
      const item = await receiptsRepo.restoreStockReceipt(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

stockReceiptsRouter.delete(
  '/:id',
  requirePermission('ingresos', 'delete'),
  async (req, res, next) => {
    try {
      await receiptsRepo.permanentlyDeleteStockReceipt(
        routeParam(req),
        getAuditActor(req),
      )
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)
