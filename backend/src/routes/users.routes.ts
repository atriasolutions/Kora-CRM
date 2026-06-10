import { Router } from 'express'

import { getAuditActor } from '../middleware/audit-actor.js'
import { forbidden } from '../middleware/errors.js'
import {
  requireAssigneeLookup,
  requirePermission,
} from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import * as usersRepo from '../repositories/users.repository.js'
import { sendAccountSetupInvite } from '../services/user-onboarding.service.js'
import {
  handleTwoFactorAdminReset,
  handleTwoFactorConfirm,
  handleTwoFactorDisable,
  handleTwoFactorSetup,
  handleTwoFactorStatus,
} from './two-factor.handlers.js'
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
} from '../validators/user.validator.js'

export const usersRouter = Router()

usersRouter.get(
  '/assignees',
  requireAssigneeLookup(),
  async (_req, res, next) => {
    try {
      const items = await usersRepo.listUsersForAssignee()
      res.json({ data: items })
    } catch (e) {
      next(e)
    }
  },
)

usersRouter.get(
  '/',
  requirePermission('usuarios', 'view'),
  async (req, res, next) => {
    try {
      const query = listUsersQuerySchema.parse(req.query)
      const result = await usersRepo.listUsers({
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        status: query.status,
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

usersRouter.get(
  '/:id',
  requirePermission('usuarios', 'view'),
  async (req, res, next) => {
    try {
      const item = await usersRepo.getUserById(routeParam(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

usersRouter.post(
  '/',
  requirePermission('usuarios', 'create'),
  async (req, res, next) => {
    try {
      const body = createUserSchema.parse(req.body)
      const item = await usersRepo.createUser(body, getAuditActor(req))
      res.status(201).json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

usersRouter.post(
  '/:id/resend-invitation',
  requirePermission('usuarios', 'edit'),
  async (req, res, next) => {
    try {
      const result = await sendAccountSetupInvite(routeParam(req))
      res.json({ data: result })
    } catch (e) {
      next(e)
    }
  },
)

usersRouter.get('/:id/2fa/status', async (req, res, next) => {
  await handleTwoFactorStatus(req, res, next, routeParam(req))
})

usersRouter.post('/:id/2fa/setup', async (req, res, next) => {
  await handleTwoFactorSetup(req, res, next, routeParam(req))
})

usersRouter.post('/:id/2fa/confirm', async (req, res, next) => {
  await handleTwoFactorConfirm(req, res, next, routeParam(req))
})

usersRouter.post('/:id/2fa/disable', async (req, res, next) => {
  await handleTwoFactorDisable(req, res, next, routeParam(req))
})

usersRouter.post('/:id/2fa/reset', requirePermission('usuarios', 'edit'), async (req, res, next) => {
  await handleTwoFactorAdminReset(req, res, next, routeParam(req))
})

usersRouter.patch(
  '/:id',
  requirePermission('usuarios', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateUserSchema.parse(req.body)
      const item = await usersRepo.updateUser(routeParam(req), body, getAuditActor(req))
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

usersRouter.delete(
  '/:id',
  async (req, res, next) => {
    const actor = getAuditActor(req)
    if (!actor.isPlatformOperator) {
      next(forbidden('Solo el operador de plataforma puede eliminar usuarios.'))
      return
    }
    try {
      await usersRepo.softDeleteUser(routeParam(req), actor)
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)
