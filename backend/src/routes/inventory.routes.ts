import { Router } from 'express'

import { getAuditActor } from '../middleware/audit-actor.js'
import { requirePermission } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as inventoryRepo from '../repositories/inventory.repository.js'
import type { UpdateInventoryInput } from '../types/inventory.js'
import {
  adjustInventorySchema,
  listInventoryQuerySchema,
  updateInventorySchema,
} from '../validators/inventory.validator.js'

export const inventoryRouter = Router()

inventoryRouter.get(
  '/',
  requirePermission('inventario', 'view'),
  async (req, res, next) => {
    try {
      const query = listInventoryQuerySchema.parse(req.query)
      const result = await inventoryRepo.listInventory({
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        status: query.status,
        warehouseId: query.warehouseId,
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

inventoryRouter.get(
  '/:id',
  requirePermission('inventario', 'view'),
  async (req, res, next) => {
    try {
      const item = await inventoryRepo.getInventoryById(routeParam(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

inventoryRouter.patch(
  '/:id',
  requirePermission('inventario', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateInventorySchema.parse(req.body) as UpdateInventoryInput
      const item = await inventoryRepo.updateInventory(
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

inventoryRouter.post(
  '/:id/adjust',
  requirePermission('inventario', 'edit'),
  async (req, res, next) => {
    try {
      const body = adjustInventorySchema.parse(req.body)
      const item = await inventoryRepo.adjustInventory(
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
