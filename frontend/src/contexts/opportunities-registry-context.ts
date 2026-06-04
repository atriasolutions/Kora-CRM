import { createContext } from 'react'

import type { OpportunityDetail } from '@/data/opportunity-detail.mock'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import type { CreateOpportunityFormValues } from '@/lib/opportunity-create'
import type { ArchivedOpportunityRecord } from '@/lib/opportunity-archive'

export type ArchivedOpportunityEntry = ArchivedOpportunityRecord & {
  opportunity: OpportunityListItem
}

export type OpportunitiesRegistryContextValue = {
  userOpportunities: OpportunityListItem[]
  allOpportunities: OpportunityListItem[]
  archivedOpportunities: ArchivedOpportunityEntry[]
  findById: (id: string) => OpportunityListItem | undefined
  addOpportunity: (values: CreateOpportunityFormValues) => Promise<OpportunityListItem>
  addOpportunities: (values: CreateOpportunityFormValues[]) => Promise<OpportunityListItem[]>
  updateOpportunityFromDetail: (detail: OpportunityDetail) => Promise<void>
  archiveOpportunity: (id: string) => Promise<void>
  archiveOpportunities: (ids: string[]) => Promise<void>
  restoreOpportunity: (id: string) => Promise<void>
  restoreOpportunities: (ids: string[]) => Promise<void>
  permanentlyDeleteOpportunity: (id: string) => void
  permanentlyDeleteOpportunities: (ids: string[]) => void
  isArchived: (id: string) => boolean
  reloadFromApi: () => Promise<void>
}

export const OpportunitiesRegistryContext =
  createContext<OpportunitiesRegistryContextValue | null>(null)
