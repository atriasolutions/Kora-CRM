import { tenantQuery } from '../db/tenant-query.js'
import { tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import type {
  CreateNotificationInput,
  Notification,
} from '../types/notification.js'

let ensureTablePromise: Promise<void> | null = null

export type NotificationRow = {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  href: string | null
  entity_type: string | null
  entity_id: string | null
  created_at: Date
  read_at: Date | null
}

function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as Notification['type'],
    title: row.title,
    message: row.message,
    href: row.href ?? undefined,
    entityType: row.entity_type ?? undefined,
    entityId: row.entity_id ?? undefined,
    createdAt: row.created_at.toISOString(),
    readAt: row.read_at ? row.read_at.toISOString() : undefined,
  }
}

async function ensureNotificationsTable(): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await tenantQuery(`
        CREATE TABLE IF NOT EXISTS crm_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID,
          user_id UUID NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
          type VARCHAR(64) NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          href TEXT,
          entity_type TEXT,
          entity_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          read_at TIMESTAMPTZ
        )
      `)
      await tenantQuery(`
        CREATE INDEX IF NOT EXISTS crm_notifications_user_unread_idx
          ON crm_notifications (user_id)
          WHERE read_at IS NULL
      `)
      await tenantQuery(`
        CREATE INDEX IF NOT EXISTS crm_notifications_user_created_idx
          ON crm_notifications (user_id, created_at DESC)
      `)
    })().catch((err) => {
      ensureTablePromise = null
      throw err
    })
  }
  await ensureTablePromise
}

export async function createNotification(
  input: CreateNotificationInput,
): Promise<Notification> {
  await ensureNotificationsTable()
  const result = await tenantQuery<NotificationRow>(
    `INSERT INTO crm_notifications (
      tenant_id,
      user_id, type, title, message, href, entity_type, entity_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8
    )
    RETURNING
      id, user_id, type, title, message, href, entity_type, entity_id, created_at, read_at`,
    [
      getTenantIdOrDefault(),
      input.userId,
      input.type,
      input.title,
      input.message,
      input.href ?? null,
      input.entityType ?? null,
      input.entityId ?? null,
    ],
  )

  return mapNotification(result.rows[0]!)
}

export async function listNotifications(args: {
  userId: string
  unreadOnly?: boolean
  limit?: number
}): Promise<Notification[]> {
  await ensureNotificationsTable()
  const limit = args.limit ?? 20
  const unreadOnly = args.unreadOnly === true
  const result = await tenantQuery<NotificationRow>(
    `SELECT
      id, user_id, type, title, message, href, entity_type, entity_id, created_at, read_at
     FROM crm_notifications
     WHERE user_id = $1 AND ${tenantWhereParam(3)}
       ${unreadOnly ? 'AND read_at IS NULL' : ''}
     ORDER BY created_at DESC
     LIMIT $2`,
    [args.userId, limit, getTenantIdOrDefault()],
  )
  return result.rows.map(mapNotification)
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  await ensureNotificationsTable()
  const result = await tenantQuery<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM crm_notifications
     WHERE user_id = $1 AND read_at IS NULL AND ${tenantWhereParam(2)}`,
    [userId, getTenantIdOrDefault()],
  )
  return Number.parseInt(result.rows[0]?.count ?? '0', 10)
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await ensureNotificationsTable()
  await tenantQuery(
    `UPDATE crm_notifications
     SET read_at = now()
     WHERE id = $1 AND user_id = $2 AND read_at IS NULL AND ${tenantWhereParam(3)}`,
    [notificationId, userId, getTenantIdOrDefault()],
  )
}

export async function markAllNotificationsRead(userId: string) {
  await ensureNotificationsTable()
  await tenantQuery(
    `UPDATE crm_notifications
     SET read_at = now()
     WHERE user_id = $1 AND read_at IS NULL AND ${tenantWhereParam(2)}`,
    [userId, getTenantIdOrDefault()],
  )
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  await ensureNotificationsTable()
  await tenantQuery(`DELETE FROM crm_notifications WHERE user_id = $1 AND ${tenantWhereParam(2)}`, [
    userId,
    getTenantIdOrDefault(),
  ])
}

