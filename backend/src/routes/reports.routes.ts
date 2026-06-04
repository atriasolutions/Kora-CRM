import { Router } from 'express'

import { getAuditActor } from '../middleware/audit-actor.js'
import { requirePermission } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as reportsRepo from '../repositories/reports.repository.js'
import type { ReportFolderInput, ReportItemInput } from '../types/report.js'
import {
  createReportFolderSchema,
  createReportSchema,
  executeReportTableSchema,
  updateReportFolderSchema,
  updateReportSchema,
} from '../validators/report.validator.js'
import { executeReportTable } from '../services/report-table-run.service.js'
import type { ReportTableConfig } from '../types/report-table.js'

export const reportsRouter = Router()

reportsRouter.get(
  '/tree',
  requirePermission('reportes', 'view'),
  async (_req, res, next) => {
    try {
      const tree = await reportsRepo.getReportsTree()
      res.json({ data: tree })
    } catch (e) {
      next(e)
    }
  },
)

reportsRouter.post(
  '/execute-table',
  requirePermission('reportes', 'view'),
  async (req, res, next) => {
    try {
      const body = executeReportTableSchema.parse(req.body)
      const data = await executeReportTable(body.tableConfig as ReportTableConfig)
      res.json({ data })
    } catch (e) {
      next(e)
    }
  },
)

reportsRouter.get(
  '/:id',
  requirePermission('reportes', 'view'),
  async (req, res, next) => {
    try {
      const item = await reportsRepo.getReportById(routeParam(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

reportsRouter.post(
  '/folders',
  requirePermission('reportes', 'create'),
  async (req, res, next) => {
    try {
      const body = createReportFolderSchema.parse(req.body) as ReportFolderInput
      const folder = await reportsRepo.createReportFolder(body)
      res.status(201).json({ data: folder })
    } catch (e) {
      next(e)
    }
  },
)

reportsRouter.patch(
  '/folders/:id',
  requirePermission('reportes', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateReportFolderSchema.parse(req.body)
      const folder = await reportsRepo.updateReportFolder(routeParam(req), body.name)
      res.json({ data: folder })
    } catch (e) {
      next(e)
    }
  },
)

reportsRouter.delete(
  '/folders/:id',
  requirePermission('reportes', 'delete'),
  async (req, res, next) => {
    try {
      const result = await reportsRepo.deleteReportFolder(routeParam(req))
      if (!result.ok) {
        res.status(400).json({ error: result.error })
        return
      }
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)

reportsRouter.post(
  '/',
  requirePermission('reportes', 'create'),
  async (req, res, next) => {
    try {
      const body = createReportSchema.parse(req.body) as ReportItemInput
      const item = await reportsRepo.createReport(body, getAuditActor(req))
      res.status(201).json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

reportsRouter.patch(
  '/:id/table-config',
  requirePermission('reportes', 'edit'),
  async (req, res, next) => {
    try {
      const { tableConfig } = req.body as { tableConfig: ReportItemInput['tableConfig'] }
      if (!tableConfig) {
        res.status(400).json({ error: 'tableConfig es obligatorio' })
        return
      }
      const item = await reportsRepo.updateReportTableConfig(
        routeParam(req),
        tableConfig,
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

reportsRouter.patch(
  '/:id',
  requirePermission('reportes', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateReportSchema.parse(req.body) as Partial<ReportItemInput>
      const item = await reportsRepo.updateReport(
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

reportsRouter.post(
  '/:id/run',
  requirePermission('reportes', 'edit'),
  async (req, res, next) => {
    try {
      const item = await reportsRepo.recordReportRun(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({
        data: {
          report: item,
          lastRun: item.lastRun,
        },
      })
    } catch (e) {
      next(e)
    }
  },
)

reportsRouter.delete(
  '/:id',
  requirePermission('reportes', 'delete'),
  async (req, res, next) => {
    try {
      await reportsRepo.deleteReport(routeParam(req))
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)
