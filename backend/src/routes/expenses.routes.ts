import { Router } from 'express'

import { getAuditActor } from '../middleware/audit-actor.js'
import { requirePermission } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as expensesRepo from '../repositories/expenses.repository.js'
import type { CreateExpenseInput, UpdateExpenseInput } from '../types/expense.js'
import {
  createExpenseSchema,
  listExpensesQuerySchema,
  updateExpenseSchema,
} from '../validators/expense.validator.js'

export const expensesRouter = Router()

expensesRouter.get(
  '/',
  requirePermission('gastos', 'view'),
  async (req, res, next) => {
    try {
      const query = listExpensesQuerySchema.parse(req.query)
      const result = await expensesRepo.listExpenses({
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        status: query.status,
        category: query.category,
        paymentMethod: query.paymentMethod,
        supplierId: query.supplierId,
        archivedOnly: query.archived === true,
        sortBy: query.sortBy,
        sortDir: query.sortDir,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        ownerName: query.ownerName,
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

expensesRouter.get(
  '/:id',
  requirePermission('gastos', 'view'),
  async (req, res, next) => {
    try {
      const item = await expensesRepo.getExpenseById(routeParam(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

expensesRouter.post(
  '/',
  requirePermission('gastos', 'create'),
  async (req, res, next) => {
    try {
      const body = createExpenseSchema.parse(req.body) as CreateExpenseInput
      const item = await expensesRepo.createExpense(body, getAuditActor(req))
      res.status(201).json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

expensesRouter.patch(
  '/:id',
  requirePermission('gastos', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateExpenseSchema.parse(req.body) as UpdateExpenseInput
      const item = await expensesRepo.updateExpense(
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

expensesRouter.post(
  '/:id/archive',
  requirePermission('gastos', 'delete'),
  async (req, res, next) => {
    try {
      const item = await expensesRepo.archiveExpense(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

expensesRouter.post(
  '/:id/restore',
  requirePermission('gastos', 'delete'),
  async (req, res, next) => {
    try {
      const item = await expensesRepo.restoreExpense(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

expensesRouter.delete(
  '/:id',
  requirePermission('gastos', 'delete'),
  async (req, res, next) => {
    try {
      await expensesRepo.permanentlyDeleteExpense(
        routeParam(req),
        getAuditActor(req),
      )
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)
