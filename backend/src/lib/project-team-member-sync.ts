import { pool } from '../db/pool.js'
import type { ProjectTeamMemberDto } from '../types/project.js'
import type { ProjectTeamMemberInput } from '../types/project.js'
import { collectNewWorkItemAssignees } from './project-work-plan-notify.js'
import type { ProjectWorkPlanJson } from './project-work-plan-json.js'

export type TeamMemberRef = {
  userId?: string | null
  userName: string
  roleLabel?: string | null
}

function memberKey(member: TeamMemberRef): string {
  const id = member.userId?.trim()
  if (id) return `id:${id.toLowerCase()}`
  return `name:${member.userName.trim().toLowerCase()}`
}

export function teamMembersFromDto(team: ProjectTeamMemberDto[]): TeamMemberRef[] {
  return team.map((m) => ({
    userId: m.userId ?? null,
    userName: m.name,
    roleLabel: m.role || null,
  }))
}

export function teamMembersFromInput(
  team: ProjectTeamMemberInput[] | undefined,
): TeamMemberRef[] {
  if (!team?.length) return []
  return team
    .filter((m) => m.userName?.trim())
    .map((m) => ({
      userId: m.userId ?? null,
      userName: m.userName!.trim(),
      roleLabel: m.roleLabel ?? null,
    }))
}

function teamInputKey(member: ProjectTeamMemberInput): string {
  const id = member.userId?.trim().toLowerCase()
  if (id) return `id:${id}`
  return `name:${member.userName?.trim().toLowerCase() ?? ''}`
}

/** Una fila por persona; el gerente no se guarda en la tabla de equipo (va en manager_name). */
export function dedupeTeamMemberInputs(
  team: ProjectTeamMemberInput[] | undefined,
  managerName: string,
): ProjectTeamMemberInput[] {
  const managerLower = managerName.trim().toLowerCase()
  const byKey = new Map<string, ProjectTeamMemberInput>()

  for (const member of team ?? []) {
    const name = member.userName?.trim()
    if (!name) continue
    if (name.toLowerCase() === managerLower) continue
    const key = teamInputKey(member)
    if (!key || key === 'name:') continue
    if (!byKey.has(key)) byKey.set(key, member)
  }

  return Array.from(byKey.values())
}

export function collectNewTeamMembers(
  previous: TeamMemberRef[],
  next: TeamMemberRef[],
  managerName: string,
): TeamMemberRef[] {
  const prevKeys = new Set(previous.map(memberKey))
  const manager = managerName.trim().toLowerCase()
  const added: TeamMemberRef[] = []

  for (const member of next) {
    const name = member.userName.trim()
    if (!name) continue
    const key = memberKey(member)
    if (prevKeys.has(key)) continue
    if (name.toLowerCase() === manager) continue
    added.push(member)
  }
  return added
}

/** Nombres únicos de responsables recién añadidos en el plan. */
export function collectUniqueNewAssigneeNames(
  previous: ProjectWorkPlanJson,
  next: ProjectWorkPlanJson,
): string[] {
  const additions = collectNewWorkItemAssignees(previous, next)
  const seen = new Set<string>()
  const names: string[] = []
  for (const row of additions) {
    const name = row.assigneeName.trim()
    const key = name.toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    names.push(name)
  }
  return names
}

async function resolveUserIdByName(name: string): Promise<string | null> {
  const result = await pool.query<{ id: string }>(
    `SELECT id FROM crm_users
     WHERE deleted_at IS NULL AND name ILIKE $1
     LIMIT 1`,
    [name.trim()],
  )
  return result.rows[0]?.id ?? null
}

function isNameOnTeam(
  rows: { user_id: string | null; user_name: string }[],
  name: string,
  userId: string | null,
  managerLower: string,
): boolean {
  const normalized = name.trim().toLowerCase()
  if (normalized === managerLower) return true
  for (const row of rows) {
    if (row.user_name?.trim().toLowerCase() === normalized) return true
    if (userId && row.user_id === userId) return true
  }
  return false
}

/**
 * Añade al equipo del proyecto a quienes pasan a ser responsables en el plan.
 * No modifica assignees de actividades (el equipo es para acceso/seguimiento).
 */
export async function syncNewAssigneesToProjectTeam(
  projectId: string,
  managerName: string,
  previousPlan: ProjectWorkPlanJson,
  nextPlan: ProjectWorkPlanJson,
): Promise<void> {
  const assigneeNames = collectUniqueNewAssigneeNames(previousPlan, nextPlan)
  if (assigneeNames.length === 0) return

  const managerLower = managerName.trim().toLowerCase()
  const teamResult = await pool.query<{ user_id: string | null; user_name: string }>(
    `SELECT user_id, user_name
     FROM crm_project_team_members
     WHERE project_id = $1`,
    [projectId],
  )
  const existing = teamResult.rows

  for (const name of assigneeNames) {
    if (name.trim().toLowerCase() === managerLower) continue
    const userId = await resolveUserIdByName(name)
    if (isNameOnTeam(existing, name, userId, managerLower)) continue

    await pool.query(
      `INSERT INTO crm_project_team_members (project_id, user_id, user_name, role_label)
       VALUES ($1, $2, $3, $4)`,
      [projectId, userId, name.trim(), 'Responsable en plan'],
    )
    existing.push({ user_id: userId, user_name: name.trim() })
  }
}
