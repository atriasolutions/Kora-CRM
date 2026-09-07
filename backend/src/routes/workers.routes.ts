import { Router } from 'express'

import { getAuditActor } from '../middleware/audit-actor.js'
import { requirePermission } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as workersRepo from '../repositories/workers.repository.js'
import type {
  CreatePayrollInput,
  CreateVacationInput,
  CreateWorkerInput,
  UpdateVacationInput,
  UpdateWorkerInput,
} from '../types/worker.js'
import {
  createPayrollSchema,
  createVacationSchema,
  createWorkerSchema,
  listWorkersQuerySchema,
  updateVacationSchema,
  updateWorkerSchema,
} from '../validators/worker.validator.js'
import { renderPayrollHtml } from '../lib/worker-payroll-pdf.js'

export const workersRouter = Router()

// ── Trabajadores ──────────────────────────────────────────────────────────────
workersRouter.get('/', requirePermission('trabajadores', 'view'), async (req, res, next) => {
  try {
    const query = listWorkersQuerySchema.parse(req.query)
    const result = await workersRepo.listWorkers({
      page: query.page,
      pageSize: query.pageSize,
      q: query.q,
      status: query.status,
      contractType: query.contractType,
      businessUnit: query.businessUnit,
      archivedOnly: query.archived === true,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
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
})

workersRouter.get('/:id', requirePermission('trabajadores', 'view'), async (req, res, next) => {
  try {
    const item = await workersRepo.getWorkerById(routeParam(req))
    res.json({ data: item })
  } catch (e) {
    next(e)
  }
})

workersRouter.post('/', requirePermission('trabajadores', 'create'), async (req, res, next) => {
  try {
    const body = createWorkerSchema.parse(req.body) as CreateWorkerInput
    const item = await workersRepo.createWorker(body, getAuditActor(req))
    res.status(201).json({ data: item })
  } catch (e) {
    next(e)
  }
})

workersRouter.patch('/:id', requirePermission('trabajadores', 'edit'), async (req, res, next) => {
  try {
    const body = updateWorkerSchema.parse(req.body) as UpdateWorkerInput
    const item = await workersRepo.updateWorker(routeParam(req), body, getAuditActor(req))
    res.json({ data: item })
  } catch (e) {
    next(e)
  }
})

workersRouter.post('/:id/archive', requirePermission('trabajadores', 'delete'), async (req, res, next) => {
  try {
    const item = await workersRepo.archiveWorker(routeParam(req), getAuditActor(req))
    res.json({ data: item })
  } catch (e) {
    next(e)
  }
})

workersRouter.post('/:id/restore', requirePermission('trabajadores', 'delete'), async (req, res, next) => {
  try {
    const item = await workersRepo.restoreWorker(routeParam(req), getAuditActor(req))
    res.json({ data: item })
  } catch (e) {
    next(e)
  }
})

workersRouter.delete('/:id', requirePermission('trabajadores', 'delete'), async (req, res, next) => {
  try {
    await workersRepo.permanentlyDeleteWorker(routeParam(req), getAuditActor(req))
    res.status(204).send()
  } catch (e) {
    next(e)
  }
})

// ── Vacaciones ────────────────────────────────────────────────────────────────
workersRouter.get('/:id/vacations', requirePermission('trabajadores', 'view'), async (req, res, next) => {
  try {
    const items = await workersRepo.listVacations(routeParam(req))
    res.json({ data: items })
  } catch (e) {
    next(e)
  }
})

workersRouter.post('/:id/vacations', requirePermission('trabajadores', 'edit'), async (req, res, next) => {
  try {
    const body = createVacationSchema.parse(req.body) as CreateVacationInput
    const item = await workersRepo.createVacation(routeParam(req), body, getAuditActor(req))
    res.status(201).json({ data: item })
  } catch (e) {
    next(e)
  }
})

workersRouter.patch('/:id/vacations/:vacationId', requirePermission('trabajadores', 'edit'), async (req, res, next) => {
  try {
    const body = updateVacationSchema.parse(req.body) as UpdateVacationInput
    const item = await workersRepo.updateVacation(
      routeParam(req),
      routeParam(req, 'vacationId'),
      body,
      getAuditActor(req),
    )
    res.json({ data: item })
  } catch (e) {
    next(e)
  }
})

workersRouter.delete('/:id/vacations/:vacationId', requirePermission('trabajadores', 'edit'), async (req, res, next) => {
  try {
    await workersRepo.deleteVacation(
      routeParam(req),
      routeParam(req, 'vacationId'),
      getAuditActor(req),
    )
    res.status(204).send()
  } catch (e) {
    next(e)
  }
})

// ── Liquidaciones ─────────────────────────────────────────────────────────────
workersRouter.get('/:id/payrolls', requirePermission('trabajadores', 'view'), async (req, res, next) => {
  try {
    const items = await workersRepo.listPayrolls(routeParam(req))
    res.json({ data: items })
  } catch (e) {
    next(e)
  }
})

workersRouter.post('/:id/payrolls', requirePermission('trabajadores', 'edit'), async (req, res, next) => {
  try {
    const body = createPayrollSchema.parse(req.body) as CreatePayrollInput
    const item = await workersRepo.createPayroll(routeParam(req), body, getAuditActor(req))
    res.status(201).json({ data: item })
  } catch (e) {
    next(e)
  }
})

workersRouter.post('/:id/payrolls/:payrollId/pay', requirePermission('trabajadores', 'edit'), async (req, res, next) => {
  try {
    const paid = req.body?.paid !== false
    const item = await workersRepo.markPayrollPaid(
      routeParam(req),
      routeParam(req, 'payrollId'),
      paid,
      getAuditActor(req),
    )
    res.json({ data: item })
  } catch (e) {
    next(e)
  }
})

workersRouter.delete('/:id/payrolls/:payrollId', requirePermission('trabajadores', 'edit'), async (req, res, next) => {
  try {
    await workersRepo.deletePayroll(
      routeParam(req),
      routeParam(req, 'payrollId'),
      getAuditActor(req),
    )
    res.status(204).send()
  } catch (e) {
    next(e)
  }
})

// PDF imprimible (HTML) de la liquidación.
workersRouter.get('/:id/payrolls/:payrollId/pdf', requirePermission('trabajadores', 'view'), async (req, res, next) => {
  try {
    const workerId = routeParam(req)
    const payrollId = routeParam(req, 'payrollId')
    const [payroll, snapshot] = await Promise.all([
      workersRepo.getPayrollById(workerId, payrollId),
      workersRepo.getPayrollSnapshot(workerId, payrollId),
    ])
    const html = renderPayrollHtml(payroll, snapshot)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  } catch (e) {
    next(e)
  }
})
