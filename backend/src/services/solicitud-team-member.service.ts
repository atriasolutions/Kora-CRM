import { env } from '../config/env.js'
import { solicitudTeamMemberEmail } from '../emails/solicitud-team-member.js'
import { pool } from '../db/pool.js'
import type { AuditActor } from '../types/audit.js'
import { notifySolicitudTeamMemberAdded } from './notifications.service.js'
import { sendMail } from './mail.service.js'

function buildSolicitudUrl(solicitudId: string): string {
  return `${env.appPublicUrl}/solicitudes/${solicitudId}`
}

async function resolveUserEmail(
  userId: string | null | undefined,
  userName: string,
): Promise<{ email: string; name: string } | null> {
  if (userId?.trim()) {
    const byId = await pool.query<{ email: string; name: string }>(
      `SELECT email, name
       FROM crm_users
       WHERE id = $1 AND deleted_at IS NULL AND status = 'Activo'
       LIMIT 1`,
      [userId.trim()],
    )
    const row = byId.rows[0]
    if (row?.email?.trim()) {
      return { email: row.email.trim(), name: row.name?.trim() || userName }
    }
  }

  const normalized = userName.trim()
  if (!normalized) return null
  const byName = await pool.query<{ email: string; name: string }>(
    `SELECT email, name
     FROM crm_users
     WHERE deleted_at IS NULL
       AND status = 'Activo'
       AND lower(trim(name)) = lower($1)
     LIMIT 1`,
    [normalized],
  )
  const row = byName.rows[0]
  if (!row?.email?.trim()) return null
  return { email: row.email.trim(), name: row.name?.trim() || normalized }
}

export async function notifyAndEmailNewSolicitudTeamMembers(params: {
  actor: AuditActor
  solicitudId: string
  solicitudTitle: string
  members: { userId?: string | null; userName: string; roleLabel?: string | null }[]
}): Promise<void> {
  for (const member of params.members) {
    const userName = member.userName.trim()
    if (!userName) continue

    void notifySolicitudTeamMemberAdded({
      actor: params.actor,
      memberName: userName,
      solicitudId: params.solicitudId,
      solicitudTitle: params.solicitudTitle,
    }).catch(() => {
      /* ignore */
    })

    const resolved = await resolveUserEmail(member.userId, userName)
    if (!resolved) {
      console.warn(
        '[mail] sin correo para miembro de solicitud:',
        userName,
        '(solicitud',
        params.solicitudId,
        ')',
      )
      continue
    }

    const mail = solicitudTeamMemberEmail({
      userName: resolved.name,
      solicitudTitle: params.solicitudTitle,
      solicitudUrl: buildSolicitudUrl(params.solicitudId),
      addedByName: params.actor.userName,
      roleLabel: member.roleLabel ?? undefined,
    })

    const emailed = await sendMail({
      to: resolved.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      category: mail.category,
    })
    if (emailed) {
      console.info('[mail] invitación equipo solicitud →', resolved.email)
    }
  }
}
