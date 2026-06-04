import { Router } from 'express'

import { getAuditActor } from '../middleware/audit-actor.js'
import { requirePermission } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as productsRepo from '../repositories/products.repository.js'
import {
  createProductSchema,
  listProductsQuerySchema,
  updateProductSchema,
} from '../validators/product.validator.js'

export const productsRouter = Router()

productsRouter.get(
  '/',
  requirePermission('productos', 'view'),
  async (req, res, next) => {
    try {
      const query = listProductsQuerySchema.parse(req.query)
      const result = await productsRepo.listProducts({
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

productsRouter.get(
  '/:id',
  requirePermission('productos', 'view'),
  async (req, res, next) => {
    try {
      const item = await productsRepo.getProductById(routeParam(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

productsRouter.post(
  '/',
  requirePermission('productos', 'create'),
  async (req, res, next) => {
    try {
      const body = createProductSchema.parse(req.body)
      const item = await productsRepo.createProduct(body, getAuditActor(req))
      res.status(201).json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

productsRouter.patch(
  '/:id',
  requirePermission('productos', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateProductSchema.parse(req.body)
      const item = await productsRepo.updateProduct(
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

productsRouter.delete(
  '/:id',
  requirePermission('productos', 'delete'),
  async (req, res, next) => {
    try {
      await productsRepo.permanentlyDeleteProduct(routeParam(req))
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)

productsRouter.post(
  '/:id/archive',
  requirePermission('productos', 'delete'),
  async (req, res, next) => {
    try {
      const item = await productsRepo.archiveProduct(routeParam(req), getAuditActor(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

productsRouter.post(
  '/:id/restore',
  requirePermission('productos', 'delete'),
  async (req, res, next) => {
    try {
      const item = await productsRepo.restoreProduct(routeParam(req), getAuditActor(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)
