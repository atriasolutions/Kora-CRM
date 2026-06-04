import { Router } from 'express'

import { requirePermission } from '../middleware/require-permission.js'
import * as categoriesRepo from '../repositories/product-categories.repository.js'
import { routeParam } from '../lib/route-params.js'
import {
  createProductCategorySchema,
  updateProductCategorySchema,
} from '../validators/settings.validator.js'

export const productCategoriesRouter = Router()

productCategoriesRouter.get(
  '/',
  requirePermission('productos', 'view'),
  async (_req, res, next) => {
    try {
      const data = await categoriesRepo.listProductCategories()
      res.json({ data })
    } catch (e) {
      next(e)
    }
  },
)

productCategoriesRouter.get(
  '/:id',
  requirePermission('productos', 'view'),
  async (req, res, next) => {
    try {
      const data = await categoriesRepo.getProductCategoryById(routeParam(req))
      res.json({ data })
    } catch (e) {
      next(e)
    }
  },
)

productCategoriesRouter.post(
  '/',
  requirePermission('productos', 'create'),
  async (req, res, next) => {
    try {
      const body = createProductCategorySchema.parse(req.body)
      const data = await categoriesRepo.createProductCategory(body)
      res.status(201).json({ data })
    } catch (e) {
      next(e)
    }
  },
)

productCategoriesRouter.patch(
  '/:id',
  requirePermission('productos', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateProductCategorySchema.parse(req.body)
      const data = await categoriesRepo.updateProductCategory(routeParam(req), body)
      res.json({ data })
    } catch (e) {
      next(e)
    }
  },
)

productCategoriesRouter.delete(
  '/:id',
  requirePermission('productos', 'delete'),
  async (req, res, next) => {
    try {
      await categoriesRepo.deleteProductCategory(routeParam(req))
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)
