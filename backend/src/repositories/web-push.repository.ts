import { tenantQuery } from '../db/tenant-query.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'

export type WebPushSubscriptionRecord = {
  id: string
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
}

type Row = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
}

function mapRow(row: Row): WebPushSubscriptionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    userAgent: row.user_agent ?? undefined,
  }
}

export async function upsertWebPushSubscription(input: {
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
}): Promise<WebPushSubscriptionRecord> {
  const tenantId = getTenantIdOrDefault()
  const result = await tenantQuery<Row>(
    `INSERT INTO crm_web_push_subscriptions (
       tenant_id, user_id, endpoint, p256dh, auth, user_agent
     ) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (endpoint) DO UPDATE SET
       tenant_id = EXCLUDED.tenant_id,
       user_id = EXCLUDED.user_id,
       p256dh = EXCLUDED.p256dh,
       auth = EXCLUDED.auth,
       user_agent = EXCLUDED.user_agent,
       updated_at = now()
     RETURNING id, user_id, endpoint, p256dh, auth, user_agent`,
    [
      tenantId,
      input.userId,
      input.endpoint,
      input.p256dh,
      input.auth,
      input.userAgent?.trim() || null,
    ],
  )
  return mapRow(result.rows[0]!)
}

export async function deleteWebPushSubscription(input: {
  userId: string
  endpoint: string
}): Promise<boolean> {
  const result = await tenantQuery(
    `DELETE FROM crm_web_push_subscriptions
     WHERE user_id = $1
       AND endpoint = $2
       AND tenant_id = $3`,
    [input.userId, input.endpoint, getTenantIdOrDefault()],
  )
  return (result.rowCount ?? 0) > 0
}

export async function listWebPushSubscriptionsForUser(
  userId: string,
): Promise<WebPushSubscriptionRecord[]> {
  const result = await tenantQuery<Row>(
    `SELECT id, user_id, endpoint, p256dh, auth, user_agent
     FROM crm_web_push_subscriptions
     WHERE user_id = $1
       AND tenant_id = $2`,
    [userId, getTenantIdOrDefault()],
  )
  return result.rows.map(mapRow)
}

export async function deleteWebPushSubscriptionById(id: string): Promise<void> {
  await tenantQuery(
    `DELETE FROM crm_web_push_subscriptions
     WHERE id = $1
       AND tenant_id = $2`,
    [id, getTenantIdOrDefault()],
  )
}
