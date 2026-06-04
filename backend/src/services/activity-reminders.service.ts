import { pool } from '../db/pool.js'
import { broadcastActivitiesRefreshForUserName } from './notifications.service.js'

const REMINDER_POLL_MS = 60_000

let pollTimer: ReturnType<typeof setInterval> | null = null
let schemaReady: Promise<void> | null = null

async function ensureReminderNotifiedColumn(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool
      .query(
        `ALTER TABLE crm_activities
         ADD COLUMN IF NOT EXISTS reminder_notified_at TIMESTAMPTZ`,
      )
      .then(() => undefined)
      .catch((err) => {
        schemaReady = null
        throw err
      })
  }
  await schemaReady
}

type DueActivityRow = {
  id: string
  title: string
  assignee_name: string | null
  reminder_at: Date
}

export async function processDueActivityReminders(): Promise<number> {
  await ensureReminderNotifiedColumn()

  const due = await pool.query<DueActivityRow>(
    `SELECT id, title, assignee_name, reminder_at
     FROM crm_activities
     WHERE deleted_at IS NULL
       AND status IN ('Pendiente', 'En curso')
       AND reminder_at IS NOT NULL
       AND reminder_at <= now()
       AND reminder_notified_at IS NULL
     ORDER BY reminder_at ASC
     LIMIT 100`,
  )

  if (due.rows.length === 0) return 0

  for (const row of due.rows) {
    const assignee = row.assignee_name?.trim()

    if (assignee) {
      await broadcastActivitiesRefreshForUserName(assignee)
    }

    await pool.query(
      `UPDATE crm_activities
       SET reminder_notified_at = now()
       WHERE id = $1 AND reminder_notified_at IS NULL`,
      [row.id],
    )
  }

  return due.rows.length
}

export function startActivityReminderScheduler(): void {
  if (pollTimer) return

  void processDueActivityReminders().catch((err) => {
    console.error('[activity-reminders] error en ciclo inicial:', err)
  })

  pollTimer = setInterval(() => {
    void processDueActivityReminders().catch((err) => {
      console.error('[activity-reminders] error en ciclo:', err)
    })
  }, REMINDER_POLL_MS)
}

export function stopActivityReminderScheduler(): void {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}
