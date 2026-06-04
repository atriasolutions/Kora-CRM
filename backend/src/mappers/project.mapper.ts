import type {
  ProjectDetail,
  ProjectListItem,
  ProjectTeamMemberDto,
} from '../types/project.js'
import { formatCentsToMoney, formatPercent } from '../utils/money.js'
import { formatDateLabel, toIsoString } from '../utils/format.js'

export type ProjectRow = {
  id: string
  name: string
  client_name: string
  customer_kind: string | null
  company_id: string | null
  contact_id: string | null
  opportunity_id: string | null
  opportunity_name: string
  accepted_quote_id: string | null
  quote_code: string
  progress_pct: number | string
  deadline: Date | string | null
  manager_name: string | null
  journey_stage: string | null
  status: string | null
  priority: string | null
  health: string | null
  budget_cents: string | number | null
  start_date: Date | string | null
  created_at: Date
  created_by_id: string | null
  created_by_name: string | null
  updated_at: Date
  updated_by_id: string | null
  updated_by_name: string | null
}

export type ProjectTeamRow = {
  id: string
  project_id: string
  user_id: string | null
  user_name: string
  role_label: string | null
}

export function mapProjectTeamRow(row: ProjectTeamRow): ProjectTeamMemberDto {
  return {
    id: row.id,
    name: row.user_name,
    role: row.role_label ?? '',
  }
}

function mapCustomerKind(
  value: string | null | undefined,
): ProjectListItem['customerKind'] {
  if (value === 'empresa' || value === 'contacto') return value
  return undefined
}

export function mapProjectRow(row: ProjectRow): ProjectListItem {
  const progressPct = Number(row.progress_pct ?? 0)
  const budgetCents = row.budget_cents != null ? Number(row.budget_cents) : null
  const customerKind = mapCustomerKind(row.customer_kind)
  return {
    id: row.id,
    name: row.name,
    client: row.client_name?.trim() || '',
    customerKind,
    companyId: row.company_id ?? undefined,
    contactId: row.contact_id ?? undefined,
    contactName:
      customerKind === 'contacto' ? row.client_name?.trim() || undefined : undefined,
    opportunityId: row.opportunity_id ?? undefined,
    acceptedQuoteId: row.accepted_quote_id ?? undefined,
    progress: formatPercent(progressPct),
    progressNum: progressPct,
    deadline: formatDateLabel(row.deadline),
    manager: row.manager_name ?? '',
    journeyStage: row.journey_stage ?? 'Nuevo',
    status: row.status ?? 'En curso',
    priority: row.priority ?? 'Media',
    health: row.health ?? 'En plazo',
    budget: budgetCents != null ? formatCentsToMoney(budgetCents) : '—',
    startDate: formatDateLabel(row.start_date),
    createdAt: toIsoString(row.created_at),
    createdById: row.created_by_id ?? '',
    createdByName: row.created_by_name ?? '',
    updatedAt: toIsoString(row.updated_at),
    updatedById: row.updated_by_id ?? '',
    updatedByName: row.updated_by_name ?? '',
  }
}

export function mapProjectDetail(
  row: ProjectRow,
  team: ProjectTeamRow[],
): ProjectDetail {
  return {
    ...mapProjectRow(row),
    opportunityName: row.opportunity_name || undefined,
    acceptedQuoteCode: row.quote_code || undefined,
    team: team.map(mapProjectTeamRow),
  }
}
