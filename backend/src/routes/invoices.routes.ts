import { Router } from 'express'

import { getAuditActor } from '../middleware/audit-actor.js'
import { requirePermission } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as invoicesRepo from '../repositories/invoices.repository.js'
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
} from '../types/invoice.js'
import {
  createInvoiceSchema,
  listInvoicesQuerySchema,
  updateInvoiceSchema,
} from '../validators/invoice.validator.js'

export const invoicesRouter = Router()

invoicesRouter.get(
  '/',
  requirePermission('facturacion', 'view'),
  async (req, res, next) => {
    try {
      const query = listInvoicesQuerySchema.parse(req.query)
      const result = await invoicesRepo.listInvoices({
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        status: query.status,
        quoteId: query.quoteId,
        companyId: query.companyId,
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

invoicesRouter.get(
  '/:id',
  requirePermission('facturacion', 'view'),
  async (req, res, next) => {
    try {
      const item = await invoicesRepo.getInvoiceById(routeParam(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

invoicesRouter.post(
  '/',
  requirePermission('facturacion', 'create'),
  async (req, res, next) => {
    try {
      const body = createInvoiceSchema.parse(req.body) as CreateInvoiceInput
      const item = await invoicesRepo.createInvoice(body, getAuditActor(req))
      res.status(201).json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

invoicesRouter.patch(
  '/:id',
  requirePermission('facturacion', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateInvoiceSchema.parse(req.body) as UpdateInvoiceInput
      const item = await invoicesRepo.updateInvoice(
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

invoicesRouter.post(
  '/:id/archive',
  requirePermission('facturacion', 'delete'),
  async (req, res, next) => {
    try {
      const item = await invoicesRepo.archiveInvoice(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

invoicesRouter.post(
  '/:id/restore',
  requirePermission('facturacion', 'delete'),
  async (req, res, next) => {
    try {
      const item = await invoicesRepo.restoreInvoice(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

invoicesRouter.delete(
  '/:id',
  requirePermission('facturacion', 'delete'),
  async (req, res, next) => {
    try {
      await invoicesRepo.permanentlyDeleteInvoice(
        routeParam(req),
        getAuditActor(req),
      )
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)

invoicesRouter.post(
  '/:id/emit-sii',
  requirePermission('facturacion', 'edit'),
  async (req, res, next) => {
    try {
      const { emitSiiSchema } = await import('../validators/sii.validator.js')
      const { emitInvoiceToSii } = await import('../services/sii-emit.service.js')
      const body = emitSiiSchema.parse(req.body ?? {})
      const data = await emitInvoiceToSii(
        routeParam(req),
        getAuditActor(req),
        body.env ?? 'certification',
      )
      res.status(201).json({ data })
    } catch (e) {
      next(e)
    }
  },
)
