import webpush from 'web-push'

import { env } from '../config/env.js'
import type { Notification } from '../types/notification.js'
import * as webPushRepo from '../repositories/web-push.repository.js'

let configured = false
let warnedMissingKeys = false

function ensureConfigured(): boolean {
  if (configured) return true
  if (!env.webPushVapidPublicKey || !env.webPushVapidPrivateKey) {
    if (!warnedMissingKeys) {
      warnedMissingKeys = true
      console.warn(
        '[web-push] WEB_PUSH_VAPID_PUBLIC_KEY / WEB_PUSH_VAPID_PRIVATE_KEY no configuradas; push omitido.',
      )
    }
    return false
  }
  webpush.setVapidDetails(
    env.webPushVapidSubject,
    env.webPushVapidPublicKey,
    env.webPushVapidPrivateKey,
  )
  configured = true
  return true
}

export function getWebPushPublicKey(): string | null {
  return env.webPushVapidPublicKey || null
}

export function isWebPushConfigured(): boolean {
  return Boolean(env.webPushVapidPublicKey && env.webPushVapidPrivateKey)
}

/** Suscripciones de notebook/desktop no deben recibir push (solo Android). */
export function isAndroidUserAgent(userAgent: string | null | undefined): boolean {
  const ua = userAgent?.trim() ?? ''
  if (!ua) return true // legacy sin UA: no bloquear envío
  return /Android/i.test(ua)
}

export async function sendWebPushToUser(
  userId: string,
  notification: Notification,
): Promise<void> {
  if (!ensureConfigured()) return

  const subscriptions = await webPushRepo.listWebPushSubscriptionsForUser(userId)
  const targets = subscriptions.filter((sub) => isAndroidUserAgent(sub.userAgent))
  if (targets.length === 0) {
    if (subscriptions.length > 0) {
      console.warn(
        `[web-push] user=${userId} tiene ${subscriptions.length} suscripción(es) pero ninguna Android; omitido`,
      )
    }
    return
  }

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.message,
    href: notification.href ?? '/inicio',
    tag: notification.id,
    notificationId: notification.id,
  })

  await Promise.all(
    targets.map(async (sub) => {
      try {
        const result = await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
          {
            TTL: 60 * 60 * 12,
            urgency: 'high',
          },
        )
        console.info(
          `[web-push] enviado user=${userId} sub=${sub.id} status=${result.statusCode}`,
        )
      } catch (err) {
        const statusCode =
          err && typeof err === 'object' && 'statusCode' in err
            ? Number((err as { statusCode?: number }).statusCode)
            : undefined
        if (statusCode === 404 || statusCode === 410) {
          await webPushRepo.deleteWebPushSubscriptionById(sub.id).catch(() => {})
          return
        }
        console.warn('[web-push] fallo al enviar', sub.id, err)
      }
    }),
  )
}
