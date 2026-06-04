import { Router } from 'express'

import { getAuditActor } from '../middleware/audit-actor.js'
import { requirePermission } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as opportunitiesRepo from '../repositories/opportunities.repository.js'
import {
  createOpportunitySchema,
  listOpportunitiesQuerySchema,
  syncOpportunityQuoteSchema,
  updateOpportunitySchema,
} from '../validators/opportunity.validator.js'
import { syncOpportunityFromQuote } from '../services/opportunity-quote-sync.service.js'

export const opportunitiesRouter = Router()

opportunitiesRouter.get(
  '/',
  requirePermission('oportunidades', 'view'),
  async (req, res, next) => {
    try {
      const query = listOpportunitiesQuerySchema.parse(req.query)
      const result = await opportunitiesRepo.listOpportunities({
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        stage: query.stage,
        outcome: query.outcome,
        companyId: query.companyId,
        contactId: query.contactId,
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

opportunitiesRouter.get(
  '/:id',
  requirePermission('oportunidades', 'view'),
  async (req, res, next) => {
    try {
      const item = await opportunitiesRepo.getOpportunityById(routeParam(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

opportunitiesRouter.post(
  '/',
  requirePermission('oportunidades', 'create'),
  async (req, res, next) => {
    try {
      const body = createOpportunitySchema.parse(req.body)
      const item = await opportunitiesRepo.createOpportunity(body, getAuditActor(req))
      res.status(201).json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

opportunitiesRouter.patch(
  '/:id',
  requirePermission('oportunidades', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateOpportunitySchema.parse(req.body)
      const item = await opportunitiesRepo.updateOpportunity(
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

opportunitiesRouter.delete(
  '/:id',
  requirePermission('oportunidades', 'delete'),
  async (req, res, next) => {
    try {
      await opportunitiesRepo.softDeleteOpportunity(
        routeParam(req),
        getAuditActor(req),
      )
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)

opportunitiesRouter.post(
  '/:id/sync-quote',
  requirePermission('oportunidades', 'edit'),
  async (req, res, next) => {
    try {
      const body = syncOpportunityQuoteSchema.parse(req.body)
      const item = await syncOpportunityFromQuote(
        routeParam(req),
        body.quoteId,
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

opportunitiesRouter.post(
  '/:id/archive',
  requirePermission('oportunidades', 'delete'),
  async (req, res, next) => {
    try {
      const item = await opportunitiesRepo.archiveOpportunity(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

opportunitiesRouter.post(
  '/:id/restore',
  requirePermission('oportunidades', 'delete'),
  async (req, res, next) => {
    try {
      const item = await opportunitiesRepo.restoreOpportunity(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)
