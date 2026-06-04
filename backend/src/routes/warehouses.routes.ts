import { Router } from 'express'

import { requirePermission } from '../middleware/require-permission.js'
import * as warehousesRepo from '../repositories/warehouses.repository.js'
import { routeParam } from '../lib/route-params.js'
import {
  createWarehouseSchema,
  updateWarehouseSchema,
} from '../validators/settings.validator.js'

export const warehousesRouter = Router()

warehousesRouter.get(
  '/',
  requirePermission('configuracion', 'view'),
  async (_req, res, next) => {
    try {
      const data = await warehousesRepo.listWarehouses()
      res.json({ data })
    } catch (e) {
      next(e)
    }
  },
)

warehousesRouter.get(
  '/:id',
  requirePermission('configuracion', 'view'),
  async (req, res, next) => {
    try {
      const data = await warehousesRepo.getWarehouseById(routeParam(req))
      res.json({ data })
    } catch (e) {
      next(e)
    }
  },
)

warehousesRouter.post(
  '/',
  requirePermission('configuracion', 'create'),
  async (req, res, next) => {
    try {
      const body = createWarehouseSchema.parse(req.body)
      const data = await warehousesRepo.createWarehouse(body)
      res.status(201).json({ data })
    } catch (e) {
      next(e)
    }
  },
)

warehousesRouter.patch(
  '/:id',
  requirePermission('configuracion', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateWarehouseSchema.parse(req.body)
      const data = await warehousesRepo.updateWarehouse(routeParam(req), body)
      res.json({ data })
    } catch (e) {
      next(e)
    }
  },
)

warehousesRouter.delete(
  '/:id',
  requirePermission('configuracion', 'delete'),
  async (req, res, next) => {
    try {
      await warehousesRepo.deleteWarehouse(routeParam(req))
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)
