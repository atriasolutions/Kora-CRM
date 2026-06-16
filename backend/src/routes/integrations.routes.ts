import { Router } from 'express'

import { routeParam } from '../lib/route-params.js'
import {
  getIntegrationApiKeyFromRequest,
  requireIntegrationApiKey,
} from '../middleware/require-integration-api-key.js'
import {
  getIntegrationCatalogProductImage,
  getIntegrationCatalogSnapshot,
  listIntegrationCatalogCategories,
  listIntegrationCatalogProductsByCategory,
} from '../services/integration-catalog.service.js'
import { sendStoredEntityImage } from '../utils/serve-entity-image.js'
import { ingestIntegrationLead } from '../services/integration-lead.service.js'
import {
  integrationCatalogSnapshotQuerySchema,
  integrationCategoriesQuerySchema,
  integrationProductsByCategoryQuerySchema,
} from '../validators/integration-catalog.validator.js'
import { integrationLeadSchema } from '../validators/integration-lead.validator.js'

export const integrationsRouter = Router()

integrationsRouter.post(
  '/leads',
  requireIntegrationApiKey(),
  async (req, res, next) => {
    try {
      const body = integrationLeadSchema.parse(req.body)
      const apiKey = getIntegrationApiKeyFromRequest(req)
      const result = await ingestIntegrationLead(apiKey, body)
      res.status(201).json({ data: result })
    } catch (e) {
      next(e)
    }
  },
)

integrationsRouter.get(
  '/catalog/categories/:categoryId/products',
  requireIntegrationApiKey(),
  async (req, res, next) => {
    try {
      const query = integrationProductsByCategoryQuerySchema.parse(req.query)
      const apiKey = getIntegrationApiKeyFromRequest(req)
      const result = await listIntegrationCatalogProductsByCategory(
        apiKey,
        routeParam(req, 'categoryId'),
        {
          page: query.page,
          pageSize: query.pageSize,
          status: query.status,
          q: query.q,
          includeImages: query.includeImages,
        },
      )
      res.json({ data: result })
    } catch (e) {
      next(e)
    }
  },
)

integrationsRouter.get(
  '/catalog/products/:productId/image',
  requireIntegrationApiKey({ allowQuery: true }),
  async (req, res, next) => {
    try {
      const apiKey = getIntegrationApiKeyFromRequest(req)
      const stored = await getIntegrationCatalogProductImage(
        apiKey,
        routeParam(req, 'productId'),
      )
      sendStoredEntityImage(res, stored)
    } catch (e) {
      next(e)
    }
  },
)

integrationsRouter.get(
  '/catalog/categories',
  requireIntegrationApiKey(),
  async (req, res, next) => {
    try {
      const query = integrationCategoriesQuerySchema.parse(req.query)
      const apiKey = getIntegrationApiKeyFromRequest(req)
      const result = await listIntegrationCatalogCategories(apiKey, {
        activeOnly: query.activeOnly,
      })
      res.json({ data: result })
    } catch (e) {
      next(e)
    }
  },
)

integrationsRouter.get(
  '/catalog',
  requireIntegrationApiKey(),
  async (req, res, next) => {
    try {
      const query = integrationCatalogSnapshotQuerySchema.parse(req.query)
      const apiKey = getIntegrationApiKeyFromRequest(req)
      const result = await getIntegrationCatalogSnapshot(apiKey, {
        activeOnly: query.activeOnly,
        status: query.status,
        includeImages: query.includeImages,
      })
      res.json({ data: result })
    } catch (e) {
      next(e)
    }
  },
)
