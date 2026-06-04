import { Router } from 'express'
import { z } from 'zod'

import { getAuditActor } from '../middleware/audit-actor.js'
import { routeParam } from '../lib/route-params.js'
import * as notificationsRepo from '../repositories/notifications.repository.js'
import * as notificationsService from '../services/notifications.service.js'

export const notificationsRouter = Router()

const notifyMentionsSchema = z.object({
  mentionedUserNames: z.array(z.string().trim().min(1)).optional(),
  mentionedUserIds: z.array(z.string().uuid()).optional(),
  href: z.string().trim().optional(),
  entityType: z.string().trim().optional(),
  entityId: z.string().trim().optional(),
}).refine(
  (body) =>
    (body.mentionedUserNames?.length ?? 0) > 0 ||
    (body.mentionedUserIds?.length ?? 0) > 0,
  { message: 'Indica al menos un usuario mencionado.' },
)

notificationsRouter.get('/', async (req, res, next) => {
  try {
    const actor = getAuditActor(req)
    const unreadOnly = req.query.unreadOnly === 'true'
    const limit = req.query.limit ? Number.parseInt(String(req.query.limit), 10) : 20
    const items = await notificationsRepo.listNotifications({
      userId: actor.userId,
      unreadOnly,
      limit: Number.isFinite(limit) ? limit : 20,
    })
    const unreadCount = await notificationsRepo.countUnreadNotifications(actor.userId)
    res.json({ data: { items, unreadCount } })
  } catch (e) {
    next(e)
  }
})

notificationsRouter.patch('/read-all', async (req, res, next) => {
  try {
    const actor = getAuditActor(req)
    await notificationsRepo.markAllNotificationsRead(actor.userId)
    res.status(204).send()
  } catch (e) {
    next(e)
  }
})

notificationsRouter.delete('/', async (req, res, next) => {
  try {
    const actor = getAuditActor(req)
    await notificationsRepo.deleteAllNotifications(actor.userId)
    res.status(204).send()
  } catch (e) {
    next(e)
  }
})

notificationsRouter.patch('/:id/read', async (req, res, next) => {
  try {
    const actor = getAuditActor(req)
    await notificationsRepo.markNotificationRead(actor.userId, routeParam(req))
    res.status(204).send()
  } catch (e) {
    next(e)
  }
})

notificationsRouter.post('/mentions', async (req, res, next) => {
  try {
    const actor = getAuditActor(req)
    const body = notifyMentionsSchema.parse(req.body)
    const byName = [...new Set(
      (body.mentionedUserNames ?? []).map((n) => n.replace(/^@+/, '').trim()),
    )].filter(Boolean)
    const byId = [...new Set(body.mentionedUserIds ?? [])]

    await Promise.all([
      ...byName.map((name) =>
        notificationsService.notifyByUserName(name, {
          type: 'mention',
          title: 'Te mencionaron en una nota',
          message: `En la nota se te mencionó: ${actor.userName}.`,
          href: body.href,
          entityType: body.entityType,
          entityId: body.entityId,
        }),
      ),
      ...byId.map((userId) =>
        notificationsService.notifyByUserId(userId, {
          type: 'mention',
          title: 'Te mencionaron en una nota',
          message: `En la nota se te mencionó: ${actor.userName}.`,
          href: body.href,
          entityType: body.entityType,
          entityId: body.entityId,
        }),
      ),
    ])

    res.status(204).send()
  } catch (e) {
    next(e)
  }
})

