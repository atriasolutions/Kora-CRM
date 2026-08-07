import { Router } from 'express'

import { getAuditActor } from '../middleware/audit-actor.js'
import { requirePermission } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as companyLocationsRepo from '../repositories/company-locations.repository.js'
import * as companiesRepo from '../repositories/companies.repository.js'
import { companyLocationsSchema } from '../validators/company-location.validator.js'
import {
  createCompanySchema,
  listCompaniesQuerySchema,
  updateCompanySchema,
} from '../validators/company.validator.js'
import { sendStoredEntityImage } from '../utils/serve-entity-image.js'

export const companiesRouter = Router()

companiesRouter.get(
  '/',
  requirePermission('empresas', 'view'),
  async (req, res, next) => {
    try {
      const query = listCompaniesQuerySchema.parse(req.query)
      const result = await companiesRepo.listCompanies({
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        lifecycle: query.lifecycle,
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

companiesRouter.get(
  '/:id/logo',
  requirePermission('empresas', 'view'),
  async (req, res, next) => {
    try {
      const stored = await companiesRepo.getCompanyLogoStored(routeParam(req))
      sendStoredEntityImage(res, stored)
    } catch (e) {
      next(e)
    }
  },
)

companiesRouter.get(
  '/:id',
  requirePermission('empresas', 'view'),
  async (req, res, next) => {
    try {
      const item = await companiesRepo.getCompanyById(routeParam(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

companiesRouter.get(
  '/:id/locations',
  requirePermission('empresas', 'view'),
  async (req, res, next) => {
    try {
      const data = await companyLocationsRepo.getCompanyLocations(routeParam(req))
      res.json({ data })
    } catch (e) {
      next(e)
    }
  },
)

companiesRouter.put(
  '/:id/locations',
  requirePermission('empresas', 'edit'),
  async (req, res, next) => {
    try {
      const body = companyLocationsSchema.parse(req.body)
      const data = await companyLocationsRepo.replaceCompanyLocations(
        routeParam(req),
        body,
      )
      res.json({ data })
    } catch (e) {
      next(e)
    }
  },
)

companiesRouter.post(
  '/',
  requirePermission('empresas', 'create'),
  async (req, res, next) => {
    try {
      const body = createCompanySchema.parse(req.body)
      const item = await companiesRepo.createCompany(body, getAuditActor(req))
      res.status(201).json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

companiesRouter.patch(
  '/:id',
  requirePermission('empresas', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateCompanySchema.parse(req.body)
      const item = await companiesRepo.updateCompany(
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

companiesRouter.delete(
  '/:id',
  requirePermission('empresas', 'delete'),
  async (req, res, next) => {
    try {
      await companiesRepo.softDeleteCompany(routeParam(req), getAuditActor(req))
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)

companiesRouter.post(
  '/:id/archive',
  requirePermission('empresas', 'delete'),
  async (req, res, next) => {
    try {
      const item = await companiesRepo.archiveCompany(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

companiesRouter.post(
  '/:id/restore',
  requirePermission('empresas', 'delete'),
  async (req, res, next) => {
    try {
      const item = await companiesRepo.restoreCompany(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)
