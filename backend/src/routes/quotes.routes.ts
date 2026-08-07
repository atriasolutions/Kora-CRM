import { Router } from 'express'

import { getAuditActor } from '../middleware/audit-actor.js'
import { requirePermission } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as quotesRepo from '../repositories/quotes.repository.js'
import {
  createQuoteSchema,
  listQuotesQuerySchema,
  updateQuoteSchema,
} from '../validators/quote.validator.js'

export const quotesRouter = Router()

quotesRouter.get(
  '/',
  requirePermission('cotizaciones', 'view'),
  async (req, res, next) => {
    try {
      const query = listQuotesQuerySchema.parse(req.query)
      const result = await quotesRepo.listQuotes({
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        status: query.status,
        opportunityId: query.opportunityId,
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

quotesRouter.get(
  '/:id',
  requirePermission('cotizaciones', 'view'),
  async (req, res, next) => {
    try {
      const item = await quotesRepo.getQuoteById(routeParam(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

quotesRouter.post(
  '/',
  requirePermission('cotizaciones', 'create'),
  async (req, res, next) => {
    try {
      const body = createQuoteSchema.parse(req.body)
      const item = await quotesRepo.createQuote(body, getAuditActor(req))
      res.status(201).json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

quotesRouter.patch(
  '/:id',
  requirePermission('cotizaciones', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateQuoteSchema.parse(req.body)
      const item = await quotesRepo.updateQuote(
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

quotesRouter.post(
  '/:id/reserve-stock',
  requirePermission('cotizaciones', 'edit'),
  async (req, res, next) => {
    try {
      await quotesRepo.ensureQuoteStockReservation(routeParam(req), getAuditActor(req))
      res.json({ data: { ok: true } })
    } catch (e) {
      next(e)
    }
  },
)

quotesRouter.delete(
  '/:id',
  requirePermission('cotizaciones', 'delete'),
  async (req, res, next) => {
    try {
      await quotesRepo.softDeleteQuote(routeParam(req), getAuditActor(req))
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)

quotesRouter.post(
  '/:id/archive',
  requirePermission('cotizaciones', 'delete'),
  async (req, res, next) => {
    try {
      const item = await quotesRepo.archiveQuote(routeParam(req), getAuditActor(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

quotesRouter.post(
  '/:id/restore',
  requirePermission('cotizaciones', 'delete'),
  async (req, res, next) => {
    try {
      const item = await quotesRepo.restoreQuote(routeParam(req), getAuditActor(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)
