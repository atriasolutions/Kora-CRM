import { opportunityListSeed } from '@/data/opportunities.mock'
import type { ProjectListItem } from '@/data/projects.mock'
import type { QuoteListItem, QuoteStatus } from '@/data/quotes.mock'
import { quoteListSeed } from '@/data/quotes.mock'
import { findQuoteById as findQuoteInList } from '@/lib/quote-lookup'
import { STORAGE_PREFIX } from '@/config/brand'
import { isLocalDetailStorageActive } from '@/lib/local-detail-storage'

const RELATIONS_KEY = `${STORAGE_PREFIX}-crm-project-relations`

export type ProjectRelationsOverride = {
  opportunityId?: string | null
  acceptedQuoteId?: string | null
}

export type ProjectOpportunityLink = {
  id: string
  name: string
  company: string
  companyId?: string
  amount: string
  stage: string
  outcome: string
}

export type ProjectAcceptedQuoteLink = {
  id: string
  code: string
  title: string
  amount: string
  status: QuoteStatus
}

export type OpportunityProjectSummary = Pick<
  ProjectListItem,
  'id' | 'name' | 'client' | 'status' | 'progress' | 'deadline' | 'health'
>

function loadOverrides(): Record<string, ProjectRelationsOverride> {
  if (!isLocalDetailStorageActive()) return {}
  try {
    const raw = localStorage.getItem(RELATIONS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, ProjectRelationsOverride>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistOverrides(map: Record<string, ProjectRelationsOverride>) {
  try {
    localStorage.setItem(RELATIONS_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function getProjectRelationsOverride(
  projectId: string,
): ProjectRelationsOverride | undefined {
  return loadOverrides()[projectId]
}

export function saveProjectRelationsOverride(
  projectId: string,
  override: ProjectRelationsOverride,
) {
  if (!isLocalDetailStorageActive()) return
  const map = loadOverrides()
  map[projectId] = override
  persistOverrides(map)
}

export function resolveProjectRelations(
  project: Pick<ProjectListItem, 'id' | 'opportunityId' | 'acceptedQuoteId'>,
): Pick<ProjectListItem, 'opportunityId' | 'acceptedQuoteId'> {
  if (!isLocalDetailStorageActive()) {
    return {
      opportunityId: project.opportunityId,
      acceptedQuoteId: project.acceptedQuoteId,
    }
  }
  const override = getProjectRelationsOverride(project.id)
  return {
    opportunityId:
      override && 'opportunityId' in override
        ? (override.opportunityId ?? undefined)
        : project.opportunityId,
    acceptedQuoteId:
      override && 'acceptedQuoteId' in override
        ? (override.acceptedQuoteId ?? undefined)
        : project.acceptedQuoteId,
  }
}

export function findOpportunityById(id: string) {
  return opportunityListSeed.find((o) => o.id === id)
}

export function findQuoteById(id: string) {
  return quoteListSeed.find((q) => q.id === id)
}

export function quotesForOpportunitySelect(opportunityId: string): QuoteListItem[] {
  return quoteListSeed.filter((q) => q.opportunityId === opportunityId)
}

export function acceptedQuotesForOpportunity(opportunityId: string): QuoteListItem[] {
  return quotesForOpportunitySelect(opportunityId).filter((q) => q.status === 'Aceptada')
}

export function resolveOpportunityLink(
  opportunityId?: string,
): ProjectOpportunityLink | undefined {
  if (!opportunityId) return undefined
  const opp = findOpportunityById(opportunityId)
  if (!opp) return undefined
  return {
    id: opp.id,
    name: opp.name,
    company: opp.company,
    companyId: opp.companyId,
    amount: opp.amount,
    stage: opp.stage,
    outcome: opp.outcome,
  }
}

export function resolveAcceptedQuoteLink(
  acceptedQuoteId?: string,
): ProjectAcceptedQuoteLink | undefined {
  if (!acceptedQuoteId) return undefined
  const quote = findQuoteById(acceptedQuoteId)
  if (!quote) return undefined
  return {
    id: quote.id,
    code: quote.code,
    title: quote.title,
    amount: quote.amount,
    status: quote.status,
  }
}

export function validateProjectRelations(
  opportunityId: string,
  acceptedQuoteId: string,
  allQuotes: QuoteListItem[] = [],
): string | null {
  if (!acceptedQuoteId) return null
  if (!opportunityId) {
    return 'Selecciona una oportunidad antes de vincular una cotización.'
  }
  const quote = findQuoteInList(allQuotes, acceptedQuoteId)
  if (!quote) return 'La cotización seleccionada no existe.'
  if (quote.opportunityId !== opportunityId) {
    return 'La cotización debe pertenecer a la oportunidad seleccionada.'
  }
  return null
}

export function projectsForOpportunityFromList(
  opportunityId: string,
  allProjects: ProjectListItem[],
): OpportunityProjectSummary[] {
  return allProjects
    .filter((p) => resolveProjectRelations(p).opportunityId === opportunityId)
    .map(({ id, name, client, status, progress, deadline, health }) => ({
      id,
      name,
      client,
      status,
      progress,
      deadline,
      health,
    }))
}

export function projectsForSolicitudFromList(
  solicitudId: string,
  allProjects: ProjectListItem[],
): OpportunityProjectSummary[] {
  const id = solicitudId.trim()
  if (!id) return []
  return allProjects
    .filter((p) => p.solicitudId === id)
    .map(({ id: projectId, name, client, status, progress, deadline, health }) => ({
      id: projectId,
      name,
      client,
      status,
      progress,
      deadline,
      health,
    }))
}

export const OPPORTUNITY_SELECT_OPTIONS = opportunityListSeed.map((o) => ({
  value: o.id,
  label: `${o.name} · ${o.company}`,
}))

/** Rehidrata vínculos comerciales tras editar IDs en formulario o detalle */
export function enrichProjectCommercialLinks<
  T extends Pick<ProjectListItem, 'id' | 'opportunityId' | 'acceptedQuoteId'>,
>(project: T) {
  const rel = resolveProjectRelations(project)
  const opportunity = resolveOpportunityLink(rel.opportunityId)
  const acceptedQuote = resolveAcceptedQuoteLink(rel.acceptedQuoteId)
  return {
    ...project,
    ...rel,
    opportunity,
    opportunityName: opportunity?.name,
    opportunityId: opportunity?.id,
    acceptedQuote,
    acceptedQuoteCode: acceptedQuote?.code,
    acceptedQuoteId: rel.acceptedQuoteId,
    companyId:
      ('companyId' in project ? project.companyId : undefined) ?? opportunity?.companyId,
  }
}
