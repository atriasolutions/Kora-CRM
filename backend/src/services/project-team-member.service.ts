import { env } from '../config/env.js'
import { projectTeamMemberEmail } from '../emails/project-team-member.js'
import { pool } from '../db/pool.js'
import type { AuditActor } from '../types/audit.js'
import { notifyProjectTeamMemberAdded } from './notifications.service.js'
import { sendMail } from './mail.service.js'

function buildProjectUrl(projectId: string): string {
  return `${env.appPublicUrl}/proyectos/${projectId}`
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

export async function notifyAndEmailNewProjectTeamMembers(params: {
  actor: AuditActor
  projectId: string
  projectName: string
  members: { userId?: string | null; userName: string; roleLabel?: string | null }[]
}): Promise<void> {
  for (const member of params.members) {
    const userName = member.userName.trim()
    if (!userName) continue

    void notifyProjectTeamMemberAdded({
      actor: params.actor,
      memberName: userName,
      projectId: params.projectId,
      projectName: params.projectName,
    }).catch(() => {
      /* ignore */
    })

    const resolved = await resolveUserEmail(member.userId, userName)
    if (!resolved) {
      console.warn(
        '[mail] sin correo para miembro de proyecto:',
        userName,
        '(proyecto',
        params.projectId,
        ')',
      )
      continue
    }

    const mail = projectTeamMemberEmail({
      userName: resolved.name,
      projectName: params.projectName,
      projectUrl: buildProjectUrl(params.projectId),
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
      console.info('[mail] invitación equipo proyecto →', resolved.email)
    }
  }
}
