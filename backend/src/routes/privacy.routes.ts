import { Router } from 'express'

import { getAuditActor } from '../middleware/audit-actor.js'
import { requirePermission } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as privacyRequestsRepo from '../repositories/privacy-requests.repository.js'
import * as securityIncidentsRepo from '../repositories/security-incidents.repository.js'
import * as portabilityService from '../services/privacy-portability.service.js'
import * as privacyNoticeService from '../services/privacy-notice.service.js'
import {
  createPrivacyRequestSchema,
  createSecurityIncidentSchema,
  updatePrivacyRequestSchema,
  updateSecurityIncidentSchema,
} from '../validators/privacy.validator.js'

export const privacyRouter = Router()

privacyRouter.get('/notice', async (_req, res, next) => {
  try {
    const data = await privacyNoticeService.getPublicPrivacyMeta()
    res.json({ data })
  } catch (e) {
    next(e)
  }
})

privacyRouter.get(
  '/requests',
  requirePermission('configuracion', 'view'),
  async (_req, res, next) => {
    try {
      const items = await privacyRequestsRepo.listPrivacyRequests()
      res.json({ data: items })
    } catch (e) {
      next(e)
    }
  },
)

privacyRouter.get(
  '/requests/:id',
  requirePermission('configuracion', 'view'),
  async (req, res, next) => {
    try {
      const item = await privacyRequestsRepo.getPrivacyRequestById(routeParam(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

privacyRouter.post(
  '/requests',
  requirePermission('configuracion', 'edit'),
  async (req, res, next) => {
    try {
      const body = createPrivacyRequestSchema.parse(req.body)
      const item = await privacyRequestsRepo.createPrivacyRequest(
        body,
        getAuditActor(req),
      )
      res.status(201).json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

privacyRouter.patch(
  '/requests/:id',
  requirePermission('configuracion', 'edit'),
  async (req, res, next) => {
    try {
      const body = updatePrivacyRequestSchema.parse(req.body)
      const item = await privacyRequestsRepo.updatePrivacyRequest(
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

privacyRouter.get(
  '/contacts/:contactId/portability',
  requirePermission('contactos', 'view'),
  async (req, res, next) => {
    try {
      const data = await portabilityService.exportContactPortability(
        routeParam(req, 'contactId'),
      )
      res.json({ data })
    } catch (e) {
      next(e)
    }
  },
)

privacyRouter.post(
  '/contacts/:contactId/block',
  requirePermission('contactos', 'edit'),
  async (req, res, next) => {
    try {
      await portabilityService.executeContactBlocking(routeParam(req, 'contactId'))
      res.json({ data: { blocked: true } })
    } catch (e) {
      next(e)
    }
  },
)

privacyRouter.post(
  '/contacts/:contactId/unblock',
  requirePermission('contactos', 'edit'),
  async (req, res, next) => {
    try {
      await portabilityService.executeContactUnblock(routeParam(req, 'contactId'))
      res.json({ data: { blocked: false } })
    } catch (e) {
      next(e)
    }
  },
)

privacyRouter.get(
  '/security-incidents',
  requirePermission('configuracion', 'view'),
  async (_req, res, next) => {
    try {
      const items = await securityIncidentsRepo.listSecurityIncidents()
      res.json({ data: items })
    } catch (e) {
      next(e)
    }
  },
)

privacyRouter.post(
  '/security-incidents',
  requirePermission('configuracion', 'edit'),
  async (req, res, next) => {
    try {
      const body = createSecurityIncidentSchema.parse(req.body)
      const item = await securityIncidentsRepo.createSecurityIncident(
        body,
        getAuditActor(req),
      )
      res.status(201).json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

privacyRouter.patch(
  '/security-incidents/:id',
  requirePermission('configuracion', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateSecurityIncidentSchema.parse(req.body)
      const item = await securityIncidentsRepo.updateSecurityIncident(
        routeParam(req),
        body,
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)
