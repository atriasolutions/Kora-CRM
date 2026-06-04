import { pool } from '../db/pool.js'
import { formatSessionWhen } from '../utils/format.js'
import {
  formatLocationFromIp,
  parseUserAgentDevice,
} from '../utils/client-request.js'

/** Máximo de accesos recientes persistidos por usuario. */
export const MAX_RECENT_USER_SESSIONS = 10

export type UserSessionEntry = {
  device: string
  location: string
  when: string
}

type UserSessionRow = {
  device: string | null
  location: string | null
  occurred_at: Date
}

export type RecordUserSessionInput = {
  userId: string
  userAgent?: string
  ipAddress?: string
}

export async function recordUserSession(input: RecordUserSessionInput): Promise<void> {
  const device = parseUserAgentDevice(input.userAgent)
  const location = formatLocationFromIp(input.ipAddress)

  await pool.query(
    `INSERT INTO crm_user_sessions (user_id, device, location, occurred_at)
     VALUES ($1, $2, $3, now())`,
    [input.userId, device, location],
  )

  await pool.query(
    `WITH ranked AS (
       SELECT id,
              row_number() OVER (ORDER BY occurred_at DESC) AS rn
       FROM crm_user_sessions
       WHERE user_id = $1
     )
     DELETE FROM crm_user_sessions
     WHERE id IN (SELECT id FROM ranked WHERE rn > $2)`,
    [input.userId, MAX_RECENT_USER_SESSIONS],
  )
}

export async function listRecentUserSessions(
  userId: string,
  limit = MAX_RECENT_USER_SESSIONS,
): Promise<UserSessionEntry[]> {
  const result = await pool.query<UserSessionRow>(
    `SELECT device, location, occurred_at
     FROM crm_user_sessions
     WHERE user_id = $1
     ORDER BY occurred_at DESC
     LIMIT $2`,
    [userId, limit],
  )

  return result.rows.map((row) => ({
    device: row.device?.trim() || 'Dispositivo desconocido',
    location: row.location?.trim() || 'Ubicación desconocida',
    when: formatSessionWhen(row.occurred_at),
  }))
}
