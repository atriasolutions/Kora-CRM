import type {
  SolicitudDetail,
  SolicitudListItem,
  SolicitudPriority,
  SolicitudStatus,
  SolicitudTeamMemberDto,
} from '../types/solicitud.js'
import { toIsoString } from '../utils/format.js'

export type SolicitudRow = {
  id: string
  code: string
  title: string
  description: string
  status: string
  priority: string
  assignee_user_id: string | null
  assignee_name: string
  created_at: Date
  created_by_id: string | null
  created_by_name: string | null
  updated_at: Date
  updated_by_id: string | null
  updated_by_name: string | null
  company_id: string | null
  company_name: string | null
}

export type SolicitudTeamRow = {
  id: string
  solicitud_id: string
  user_id: string | null
  user_name: string
  role_label: string | null
}

export function mapSolicitudTeamRow(row: SolicitudTeamRow): SolicitudTeamMemberDto {
  return {
    id: row.id,
    name: row.user_name,
    role: row.role_label ?? '',
    userId: row.user_id ?? undefined,
  }
}

export function mapSolicitudRow(row: SolicitudRow): SolicitudListItem {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description ?? '',
    status: row.status as SolicitudStatus,
    priority: row.priority as SolicitudPriority,
    assignee: row.assignee_name ?? '',
    assigneeUserId: row.assignee_user_id ?? undefined,
    createdAt: toIsoString(row.created_at),
    createdById: row.created_by_id ?? '',
    createdByName: row.created_by_name ?? '',
    updatedAt: toIsoString(row.updated_at),
    updatedById: row.updated_by_id ?? '',
    updatedByName: row.updated_by_name ?? '',
    companyId: row.company_id ?? undefined,
    companyName: row.company_name?.trim() || undefined,
  }
}

export function mapSolicitudDetail(
  row: SolicitudRow,
  team: SolicitudTeamMemberDto[],
): SolicitudDetail {
  return {
    ...mapSolicitudRow(row),
    team,
  }
}

export function mapTeamRowsToListMembers(
  team: SolicitudTeamMemberDto[] | undefined,
): SolicitudListItem['teamMembers'] {
  if (!team?.length) return undefined
  return team.map((m) => ({
    id: m.id,
    name: m.name,
    userId: m.userId,
    role: m.role || undefined,
  }))
}
