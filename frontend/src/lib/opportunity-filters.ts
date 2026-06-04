import type {
  OpportunityListItem,
  OpportunityOutcome,
  OpportunityPriority,
  OpportunityStage,
} from '@/data/opportunities.mock'
import { OPPORTUNITY_STAGE_OPTIONS } from '@/data/opportunities.mock'

export type OpportunityLastActivityFilter = 'all' | 'today' | 'week' | 'stale'

export type OpportunityFilters = {
  stages: OpportunityStage[]
  outcomes: OpportunityOutcome[]
  priorities: OpportunityPriority[]
  lastActivity: OpportunityLastActivityFilter
}

export { OPPORTUNITY_STAGE_OPTIONS }

export const OPPORTUNITY_OUTCOME_OPTIONS: OpportunityOutcome[] = [
  'Abierta',
  'Ganada',
  'Perdida',
]

export const OPPORTUNITY_PRIORITY_FILTER_OPTIONS: OpportunityPriority[] = [
  'Alta',
  'Media',
  'Baja',
]

export const OPPORTUNITY_LAST_ACTIVITY_OPTIONS: {
  value: OpportunityLastActivityFilter
  label: string
}[] = [
  { value: 'all', label: 'Cualquier fecha' },
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Hoy o ayer' },
  { value: 'stale', label: 'Sin seguimiento reciente' },
]

export function createDefaultOpportunityFilters(): OpportunityFilters {
  return { stages: [], outcomes: [], priorities: [], lastActivity: 'all' }
}

export function countActiveOpportunityFilters(filters: OpportunityFilters): number {
  let n = 0
  if (filters.stages.length > 0) n += 1
  if (filters.outcomes.length > 0) n += 1
  if (filters.priorities.length > 0) n += 1
  if (filters.lastActivity !== 'all') n += 1
  return n
}

function matchesLastActivity(label: string, filter: OpportunityLastActivityFilter): boolean {
  const v = label.toLowerCase()
  switch (filter) {
    case 'today':
      return v.includes('hoy')
    case 'week':
      return v.includes('hoy') || v.includes('ayer')
    case 'stale':
      return !v.includes('hoy') && !v.includes('ayer') && !v.includes('recién')
    default:
      return true
  }
}

export function matchesOpportunityFilters(
  opp: OpportunityListItem,
  filters: OpportunityFilters,
): boolean {
  if (filters.stages.length > 0 && !filters.stages.includes(opp.stage)) return false
  if (filters.outcomes.length > 0 && !filters.outcomes.includes(opp.outcome)) return false
  if (filters.priorities.length > 0 && !filters.priorities.includes(opp.priority)) {
    return false
  }
  if (!matchesLastActivity(opp.lastActivity, filters.lastActivity)) return false
  return true
}

export function opportunityRowMatchesFilters(
  row: OpportunityListItem,
  filters: OpportunityFilters,
): boolean {
  return matchesOpportunityFilters(row, filters)
}
