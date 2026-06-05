import type { ProjectListItem } from '@/data/projects.mock'
import type { ProjectTeamMember } from '@/data/project-detail.mock'
import { getCurrentUser } from '@/lib/current-user'

export type ProjectTeamMemberRef = {
  id?: string
  name: string
  userId?: string
  role?: string
}

/** Clave estable para detectar la misma persona (userId o nombre). */
export function teamMemberIdentityKey(member: {
  userId?: string
  name: string
}): string {
  const id = member.userId?.trim().toLowerCase()
  if (id) return `id:${id}`
  return `name:${member.name.trim().toLowerCase()}`
}

export function isSameTeamPerson(
  member: { userId?: string; name: string },
  other: { userId?: string; name: string },
): boolean {
  const aId = member.userId?.trim().toLowerCase()
  const bId = other.userId?.trim().toLowerCase()
  if (aId && bId && aId === bId) return true
  return member.name.trim().toLowerCase() === other.name.trim().toLowerCase()
}

function pickPreferredTeamMember(
  a: ProjectTeamMember,
  b: ProjectTeamMember,
  managerLower: string,
): ProjectTeamMember {
  const score = (m: ProjectTeamMember) => {
    let s = 0
    const isMgr = m.name.trim().toLowerCase() === managerLower
    if (m.userId?.trim()) s += 2
    if (isMgr && m.role?.toLowerCase().includes('gerente')) s += 4
    if (isMgr) s += 1
    return s
  }
  return score(a) >= score(b) ? a : b
}

/** Una sola fila por persona; el gerente conserva rol «Gerente de proyecto». */
export function dedupeProjectTeamMembers(
  team: ProjectTeamMember[] | undefined,
  managerName?: string,
): ProjectTeamMember[] {
  const managerLower = managerName?.trim().toLowerCase() ?? ''
  const byKey = new Map<string, ProjectTeamMember>()

  for (const member of team ?? []) {
    const name = member.name?.trim()
    if (!name) continue
    const key = teamMemberIdentityKey(member)
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, member)
      continue
    }
    byKey.set(key, pickPreferredTeamMember(existing, member, managerLower))
  }

  return Array.from(byKey.values()).map((m) => {
    if (managerLower && m.name.trim().toLowerCase() === managerLower) {
      return { ...m, role: 'Gerente de proyecto' }
    }
    return m
  })
}

export function normalizeProjectTeamMembers(
  team: ProjectTeamMember[] | undefined,
  managerName?: string,
): ProjectTeamMember[] {
  const manager = managerName?.trim()
  const list = dedupeProjectTeamMembers(team, manager)
  if (manager && !list.some((m) => m.name.trim().toLowerCase() === manager.toLowerCase())) {
    list.unshift({
      id: `manager-${manager}`,
      name: manager,
      role: 'Gerente de proyecto',
    })
  }
  return list
}

export function isUserAlreadyOnProjectTeam(
  team: ProjectTeamMember[] | undefined,
  user: { id: string; name: string },
  managerName?: string,
): boolean {
  const manager = managerName?.trim().toLowerCase()
  if (manager && user.name.trim().toLowerCase() === manager) return true
  const ref = { userId: user.id, name: user.name }
  for (const member of team ?? []) {
    if (isSameTeamPerson(member, ref)) return true
  }
  return false
}

export function projectTeamMemberRefs(
  project: Pick<ProjectListItem, 'manager'> & {
    teamMembers?: ProjectTeamMemberRef[]
    team?: ProjectTeamMember[]
  },
): ProjectTeamMemberRef[] {
  if (project.team?.length) {
    return project.team.map((m) => ({
      id: m.id,
      name: m.name,
      userId: m.userId,
      role: m.role,
    }))
  }
  return project.teamMembers ?? []
}

export function isUserOnProjectTeam(
  project: Pick<ProjectListItem, 'manager'> & {
    teamMembers?: ProjectTeamMemberRef[]
    team?: ProjectTeamMember[]
  },
  user: { id: string; name: string } = getCurrentUser(),
): boolean {
  const mineId = user.id.trim().toLowerCase()
  const mineName = user.name.trim().toLowerCase()
  const manager = project.manager?.trim().toLowerCase() ?? ''
  if (manager && manager === mineName) return true

  const refs = projectTeamMemberRefs(project)
  if (refs.length === 0) return false

  for (const member of refs) {
    const memberId = member.userId?.trim().toLowerCase()
    const memberName = member.name?.trim().toLowerCase()
    if (memberId && memberId === mineId) return true
    if (memberName && memberName === mineName) return true
  }
  return false
}

export function collectProjectTeamMemberNames(
  project: Pick<ProjectListItem, 'manager'> & {
    teamMembers?: ProjectTeamMemberRef[]
    team?: ProjectTeamMember[]
  },
): string[] {
  const names = new Set<string>()
  const manager = project.manager?.trim()
  if (manager) names.add(manager)
  for (const member of projectTeamMemberRefs(project)) {
    const name = member.name?.trim()
    if (name) names.add(name)
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'es'))
}

export function collectNewTeamMembersFromLists(
  previous: ProjectTeamMember[],
  next: ProjectTeamMember[],
  managerName: string,
): ProjectTeamMember[] {
  const prevKeys = new Set(
    previous.map((m) => (m.userId?.trim() || m.name.trim()).toLowerCase()),
  )
  const manager = managerName.trim().toLowerCase()
  return next.filter((m) => {
    const name = m.name.trim()
    if (!name) return false
    const key = (m.userId?.trim() || name).toLowerCase()
    if (prevKeys.has(key)) return false
    if (name.toLowerCase() === manager) return false
    return true
  })
}

/** Añade responsables del plan al equipo del proyecto (solo acceso, sin tocar actividades). */
export function mergeAssigneesIntoProjectTeam(
  team: ProjectTeamMember[],
  assigneeNames: string[],
  managerName: string,
  userDirectory: { id: string; name: string; role?: string }[],
): ProjectTeamMember[] {
  const manager = managerName.trim().toLowerCase()
  const next = [...team]

  for (const name of assigneeNames) {
    const trimmed = name.trim()
    if (!trimmed || trimmed.toLowerCase() === manager) continue

    const user = userDirectory.find(
      (u) => u.name.trim().toLowerCase() === trimmed.toLowerCase(),
    )
    const candidate: ProjectTeamMember = {
      id: user ? `team-${user.id}` : `team-${trimmed.replace(/\s+/g, '-')}`,
      name: trimmed,
      userId: user?.id,
      role: user?.role?.trim() || 'Responsable en plan',
    }
    if (isUserAlreadyOnProjectTeam(next, { id: user?.id ?? '', name: trimmed }, managerName)) {
      continue
    }
    next.push(candidate)
  }

  return dedupeProjectTeamMembers(next, managerName)
}

export function teamToApiInput(
  team: ProjectTeamMember[],
  managerName?: string,
): { userId?: string; userName: string; roleLabel?: string }[] {
  const deduped = dedupeProjectTeamMembers(team, managerName)
  const manager = managerName?.trim()
  const managerLower = manager?.toLowerCase() ?? ''

  return deduped
    .filter((m) => m.name.trim())
    .filter((m) => !managerLower || m.name.trim().toLowerCase() !== managerLower)
    .map((m) => {
      const row: { userId?: string; userName: string; roleLabel?: string } = {
        userName: m.name.trim(),
      }
      const userId = m.userId?.trim()
      if (userId) row.userId = userId
      const role = m.role?.trim()
      if (role) row.roleLabel = role
      return row
    })
}
