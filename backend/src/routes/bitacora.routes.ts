import { Router } from 'express'

import { hasElevatedTenantScope, isGuestAccessProfile } from '../lib/access-profile-admin.js'
import {
  assertGuestCanAccessBitacoraCompany,
  resolveBitacoraCompanyScopeForActor,
} from '../lib/bitacora-guest-scope.js'
import { getAuditActor, getAuthProfile } from '../middleware/audit-actor.js'
import { forbidden } from '../middleware/errors.js'
import { requirePermission } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as bitacoraRepo from '../repositories/bitacora.repository.js'
import * as companiesRepo from '../repositories/companies.repository.js'
import type { CreateBitacoraInput, UpdateBitacoraInput } from '../types/bitacora.js'
import {
  bitacoraDashboardQuerySchema,
  companyMonthlyQuotaSchema,
  createBitacoraSchema,
  listBitacoraQuerySchema,
  updateBitacoraSchema,
} from '../validators/bitacora.validator.js'

export const bitacoraRouter = Router()

bitacoraRouter.get(
  '/',
  requirePermission('bitacora', 'view'),
  async (req, res, next) => {
    try {
      const query = listBitacoraQuerySchema.parse(req.query)
      const profile = getAuthProfile(req)
      const actor = getAuditActor(req)
      const isGuest = isGuestAccessProfile(profile)

      if (isGuest) {
        const companyScope = await resolveBitacoraCompanyScopeForActor({
          profile,
          userId: actor.userId,
          tenantId: actor.tenantId,
          requestedCompanyId: query.companyId,
        })
        if (companyScope.guestWithoutCompany || !companyScope.companyId) {
          res.json({
            data: [],
            meta: {
              page: query.page,
              pageSize: query.pageSize,
              total: 0,
              totalPages: 1,
            },
          })
          return
        }
        const result = await bitacoraRepo.listBitacora({
          page: query.page,
          pageSize: query.pageSize,
          q: query.q,
          solicitudId: query.solicitudId,
          assignedUserId: query.mine === true ? actor.userId : undefined,
          isBillable: query.billable,
          workDateFrom: query.workDateFrom,
          workDateTo: query.workDateTo,
          companyId: companyScope.companyId,
          archivedOnly: query.archived === true,
          sortBy: query.sortBy,
          sortDir: query.sortDir,
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
        return
      }

      const restrictToAssignee =
        query.mine === true || !hasElevatedTenantScope(profile)
      const result = await bitacoraRepo.listBitacora({
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        solicitudId: query.solicitudId,
        assignedUserId: restrictToAssignee ? actor.userId : undefined,
        isBillable: query.billable,
        workDateFrom: query.workDateFrom,
        workDateTo: query.workDateTo,
        companyId: query.companyId,
        archivedOnly: query.archived === true,
        sortBy: query.sortBy,
        sortDir: query.sortDir,
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

bitacoraRouter.get(
  '/dashboard-stats',
  requirePermission('bitacora', 'view'),
  async (req, res, next) => {
    try {
      const query = bitacoraDashboardQuerySchema.parse(req.query)
      const profile = getAuthProfile(req)
      const actor = getAuditActor(req)
      const isGuest = isGuestAccessProfile(profile)
      const restrictToAssignee =
        !isGuest && (query.mine === true || !hasElevatedTenantScope(profile))
      const companyScope = await resolveBitacoraCompanyScopeForActor({
        profile,
        userId: actor.userId,
        tenantId: actor.tenantId,
        requestedCompanyId: query.companyId,
      })

      if (companyScope.guestWithoutCompany) {
        const periodLabel =
          query.workDateFrom && query.workDateTo
            ? query.workDateFrom === query.workDateTo
              ? query.workDateFrom
              : `${query.workDateFrom} – ${query.workDateTo}`
            : query.workDateFrom
              ? `Desde ${query.workDateFrom}`
              : query.workDateTo
                ? `Hasta ${query.workDateTo}`
                : 'Todo el historial'
        res.json({
          data: bitacoraRepo.emptyBitacoraDashboardStats(
            periodLabel,
            companyScope.companyName,
          ),
        })
        return
      }

      const stats = await bitacoraRepo.getBitacoraDashboardStats({
        assignedUserId: restrictToAssignee ? actor.userId : undefined,
        workDateFrom: query.workDateFrom,
        workDateTo: query.workDateTo,
        companyId: companyScope.companyId,
      })
      if (companyScope.companyName) {
        stats.companyName = companyScope.companyName
      }
      res.json({ data: stats })
    } catch (e) {
      next(e)
    }
  },
)

bitacoraRouter.patch(
  '/monthly-quota/:companyId',
  requirePermission('bitacora', 'view'),
  async (req, res, next) => {
    try {
      const profile = getAuthProfile(req)
      if (!hasElevatedTenantScope(profile)) {
        throw forbidden('Solo administradores pueden configurar la cuota mensual de horas.')
      }
      const companyId = routeParam(req, 'companyId')
      const body = companyMonthlyQuotaSchema.parse(req.body)
      const monthlyAssignedHours = await companiesRepo.updateCompanyMonthlyAssignedHours(
        companyId,
        body.monthlyAssignedHours,
        getAuditActor(req),
      )
      res.json({ data: { companyId, monthlyAssignedHours } })
    } catch (e) {
      next(e)
    }
  },
)

bitacoraRouter.get(
  '/for-solicitud/:solicitudId',
  requirePermission('bitacora', 'view'),
  async (req, res, next) => {
    try {
      const profile = getAuthProfile(req)
      const actor = getAuditActor(req)
      const solicitudId = routeParam(req, 'solicitudId')
      if (isGuestAccessProfile(profile)) {
        const solicitud = await bitacoraRepo.getSolicitudCompanySnapshot(solicitudId)
        await assertGuestCanAccessBitacoraCompany({
          profile,
          userId: actor.userId,
          tenantId: actor.tenantId,
          companyId: solicitud.companyId,
        })
      }
      const items = await bitacoraRepo.listBitacoraForSolicitud(solicitudId)
      res.json({ data: items })
    } catch (e) {
      next(e)
    }
  },
)

bitacoraRouter.get(
  '/:id',
  requirePermission('bitacora', 'view'),
  async (req, res, next) => {
    try {
      const profile = getAuthProfile(req)
      const actor = getAuditActor(req)
      const item = await bitacoraRepo.getBitacoraById(routeParam(req))
      await assertGuestCanAccessBitacoraCompany({
        profile,
        userId: actor.userId,
        tenantId: actor.tenantId,
        companyId: item.companyId,
      })
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

bitacoraRouter.post(
  '/',
  requirePermission('bitacora', 'create'),
  async (req, res, next) => {
    try {
      const body = createBitacoraSchema.parse(req.body) as CreateBitacoraInput
      const item = await bitacoraRepo.createBitacora(body, getAuditActor(req))
      res.status(201).json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

bitacoraRouter.patch(
  '/:id',
  requirePermission('bitacora', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateBitacoraSchema.parse(req.body) as UpdateBitacoraInput
      const item = await bitacoraRepo.updateBitacora(
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

bitacoraRouter.post(
  '/:id/archive',
  requirePermission('bitacora', 'delete'),
  async (req, res, next) => {
    try {
      const item = await bitacoraRepo.archiveBitacora(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

bitacoraRouter.post(
  '/:id/restore',
  requirePermission('bitacora', 'delete'),
  async (req, res, next) => {
    try {
      const item = await bitacoraRepo.restoreBitacora(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

bitacoraRouter.delete(
  '/:id',
  requirePermission('bitacora', 'delete'),
  async (req, res, next) => {
    try {
      await bitacoraRepo.permanentlyDeleteBitacora(routeParam(req))
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)
