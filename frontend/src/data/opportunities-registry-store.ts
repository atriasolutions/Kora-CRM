import type { OpportunityListItem } from '@/data/opportunities.mock'

let registrySnapshot: OpportunityListItem[] = []

export function syncRegistryOpportunities(opportunities: OpportunityListItem[]) {
  registrySnapshot = opportunities
}

export function getRegistryOpportunityById(
  id: string,
): OpportunityListItem | undefined {
  return registrySnapshot.find((o) => o.id === id)
}

export function getAllKnownOpportunities(): OpportunityListItem[] {
  return registrySnapshot
}
