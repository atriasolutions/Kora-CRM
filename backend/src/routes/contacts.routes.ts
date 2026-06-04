import { Router } from 'express'

import { getAuditActor } from '../middleware/audit-actor.js'
import { requirePermission } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as contactsRepo from '../repositories/contacts.repository.js'
import {
  createContactSchema,
  listContactsQuerySchema,
  updateContactSchema,
} from '../validators/contact.validator.js'

export const contactsRouter = Router()

contactsRouter.get(
  '/',
  requirePermission('contactos', 'view'),
  async (req, res, next) => {
    try {
      const query = listContactsQuerySchema.parse(req.query)
      const result = await contactsRepo.listContacts({
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        status: query.status,
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

contactsRouter.get(
  '/:id',
  requirePermission('contactos', 'view'),
  async (req, res, next) => {
    try {
      const item = await contactsRepo.getContactById(routeParam(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

contactsRouter.post(
  '/',
  requirePermission('contactos', 'create'),
  async (req, res, next) => {
    try {
      const body = createContactSchema.parse(req.body)
      const item = await contactsRepo.createContact(body, getAuditActor(req))
      res.status(201).json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

contactsRouter.patch(
  '/:id',
  requirePermission('contactos', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateContactSchema.parse(req.body)
      const item = await contactsRepo.updateContact(
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

contactsRouter.delete(
  '/:id',
  requirePermission('contactos', 'delete'),
  async (req, res, next) => {
    try {
      await contactsRepo.softDeleteContact(routeParam(req), getAuditActor(req))
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)

contactsRouter.post(
  '/:id/archive',
  requirePermission('contactos', 'delete'),
  async (req, res, next) => {
    try {
      const item = await contactsRepo.archiveContact(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

contactsRouter.post(
  '/:id/restore',
  requirePermission('contactos', 'delete'),
  async (req, res, next) => {
    try {
      const item = await contactsRepo.restoreContact(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)
