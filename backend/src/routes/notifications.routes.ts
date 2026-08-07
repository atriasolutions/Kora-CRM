import { Router } from 'express'
import { z } from 'zod'

import { getAuditActor } from '../middleware/audit-actor.js'
import { routeParam } from '../lib/route-params.js'
import * as notificationsRepo from '../repositories/notifications.repository.js'
import * as notificationsService from '../services/notifications.service.js'
import * as webPushRepo from '../repositories/web-push.repository.js'
import {
  getWebPushPublicKey,
  isAndroidUserAgent,
  isWebPushConfigured,
} from '../services/web-push.service.js'

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

const pushSubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
  userAgent: z.string().trim().max(512).optional(),
})

const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
})

notificationsRouter.get('/push/vapid-public-key', (_req, res) => {
  if (!isWebPushConfigured()) {
    res.status(503).json({ error: 'Web Push no configurado en el servidor.' })
    return
  }
  res.json({ data: { publicKey: getWebPushPublicKey() } })
})

notificationsRouter.post('/push/subscribe', async (req, res, next) => {
  try {
    if (!isWebPushConfigured()) {
      res.status(503).json({ error: 'Web Push no configurado en el servidor.' })
      return
    }
    const actor = getAuditActor(req)
    const body = pushSubscribeSchema.parse(req.body)
    const userAgent = body.userAgent ?? req.get('user-agent') ?? undefined
    if (!isAndroidUserAgent(userAgent)) {
      res.status(400).json({
        error:
          'Las notificaciones push solo se pueden activar desde un celular Android (Chrome o la app instalada).',
      })
      return
    }
    const saved = await webPushRepo.upsertWebPushSubscription({
      userId: actor.userId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent,
    })
    res.status(201).json({
      data: {
        id: saved.id,
        endpoint: saved.endpoint,
      },
    })
  } catch (e) {
    next(e)
  }
})

notificationsRouter.delete('/push/subscribe', async (req, res, next) => {
  try {
    const actor = getAuditActor(req)
    const body = pushUnsubscribeSchema.parse(req.body)
    await webPushRepo.deleteWebPushSubscription({
      userId: actor.userId,
      endpoint: body.endpoint,
    })
    res.status(204).send()
  } catch (e) {
    next(e)
  }
})

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
