import type { SolicitudListItem, SolicitudTeamMember } from '@/data/solicitudes.mock'
import { getCurrentUser } from '@/lib/current-user'

export type SolicitudTeamMemberRef = {
  id?: string
  name: string
  userId?: string
  role?: string
}

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
  a: SolicitudTeamMember,
  b: SolicitudTeamMember,
  assigneeLower: string,
): SolicitudTeamMember {
  const score = (m: SolicitudTeamMember) => {
    let s = 0
    const isAssignee = m.name.trim().toLowerCase() === assigneeLower
    if (m.userId?.trim()) s += 2
    if (isAssignee && m.role?.toLowerCase().includes('responsable')) s += 4
    if (isAssignee) s += 1
    return s
  }
  return score(a) >= score(b) ? a : b
}

export function dedupeSolicitudTeamMembers(
  team: SolicitudTeamMember[] | undefined,
  assigneeName?: string,
): SolicitudTeamMember[] {
  const assigneeLower = assigneeName?.trim().toLowerCase() ?? ''
  const byKey = new Map<string, SolicitudTeamMember>()

  for (const member of team ?? []) {
    const name = member.name?.trim()
    if (!name) continue
    const key = teamMemberIdentityKey(member)
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, member)
      continue
    }
    byKey.set(key, pickPreferredTeamMember(existing, member, assigneeLower))
  }

  return Array.from(byKey.values()).map((m) => {
    if (assigneeLower && m.name.trim().toLowerCase() === assigneeLower) {
      return { ...m, role: 'Responsable' }
    }
    return m
  })
}

export function normalizeSolicitudTeamMembers(
  team: SolicitudTeamMember[] | undefined,
  assigneeName?: string,
): SolicitudTeamMember[] {
  const assignee = assigneeName?.trim()
  const list = dedupeSolicitudTeamMembers(team, assignee)
  if (assignee && !list.some((m) => m.name.trim().toLowerCase() === assignee.toLowerCase())) {
    list.unshift({
      id: `assignee-${assignee}`,
      name: assignee,
      role: 'Responsable',
    })
  }
  return list
}

export function isUserAlreadyOnSolicitudTeam(
  team: SolicitudTeamMember[] | undefined,
  user: { id: string; name: string },
  assigneeName?: string,
): boolean {
  const assignee = assigneeName?.trim().toLowerCase()
  if (assignee && user.name.trim().toLowerCase() === assignee) return true
  const ref = { userId: user.id, name: user.name }
  for (const member of team ?? []) {
    if (isSameTeamPerson(member, ref)) return true
  }
  return false
}

export function solicitudTeamMemberRefs(
  solicitud: Pick<SolicitudListItem, 'assignee'> & {
    teamMembers?: SolicitudTeamMemberRef[]
    team?: SolicitudTeamMember[]
  },
): SolicitudTeamMemberRef[] {
  if (solicitud.team?.length) {
    return solicitud.team.map((m) => ({
      id: m.id,
      name: m.name,
      userId: m.userId,
      role: m.role,
    }))
  }
  return solicitud.teamMembers ?? []
}

export function isUserOnSolicitudTeam(
  solicitud: Pick<SolicitudListItem, 'assignee' | 'assigneeUserId'> & {
    teamMembers?: SolicitudTeamMemberRef[]
    team?: SolicitudTeamMember[]
  },
  user: { id: string; name: string } = getCurrentUser(),
): boolean {
  const mineId = user.id.trim().toLowerCase()
  const mineName = user.name.trim().toLowerCase()
  const assigneeId = solicitud.assigneeUserId?.trim().toLowerCase() ?? ''
  const assigneeName = solicitud.assignee?.trim().toLowerCase() ?? ''
  if (assigneeId && assigneeId === mineId) return true
  if (assigneeName && assigneeName === mineName) return true

  const refs = solicitudTeamMemberRefs(solicitud)
  if (refs.length === 0) return false

  for (const member of refs) {
    const memberId = member.userId?.trim().toLowerCase()
    const memberName = member.name?.trim().toLowerCase()
    if (memberId && memberId === mineId) return true
    if (memberName && memberName === mineName) return true
  }
  return false
}

export function collectSolicitudTeamMemberNames(
  solicitud: Pick<SolicitudListItem, 'assignee'> & {
    teamMembers?: SolicitudTeamMemberRef[]
    team?: SolicitudTeamMember[]
  },
): string[] {
  const names = new Set<string>()
  const assignee = solicitud.assignee?.trim()
  if (assignee) names.add(assignee)
  for (const member of solicitudTeamMemberRefs(solicitud)) {
    const name = member.name?.trim()
    if (name) names.add(name)
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'es'))
}

export function collectNewTeamMembersFromLists(
  previous: SolicitudTeamMember[],
  next: SolicitudTeamMember[],
  assigneeName: string,
): SolicitudTeamMember[] {
  const prevKeys = new Set(
    previous.map((m) => (m.userId?.trim() || m.name.trim()).toLowerCase()),
  )
  const assignee = assigneeName.trim().toLowerCase()
  return next.filter((m) => {
    const name = m.name.trim()
    if (!name) return false
    const key = (m.userId?.trim() || name).toLowerCase()
    if (prevKeys.has(key)) return false
    if (name.toLowerCase() === assignee) return false
    return true
  })
}

export function teamToApiInput(
  team: SolicitudTeamMember[],
  assigneeName?: string,
): { userId?: string; userName: string; roleLabel?: string }[] {
  const deduped = dedupeSolicitudTeamMembers(team, assigneeName)
  const assignee = assigneeName?.trim()
  const assigneeLower = assignee?.toLowerCase() ?? ''

  return deduped
    .filter((m) => m.name.trim())
    .filter((m) => !assigneeLower || m.name.trim().toLowerCase() !== assigneeLower)
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
