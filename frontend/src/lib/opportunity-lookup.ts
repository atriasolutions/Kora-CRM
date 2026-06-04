import type { OpportunityListItem } from '@/data/opportunities.mock'

export function findOpportunityById(
  opportunities: OpportunityListItem[],
  opportunityId: string,
): OpportunityListItem | undefined {
  if (!opportunityId.trim()) return undefined
  return opportunities.find((o) => o.id === opportunityId)
}

export function searchOpportunities(
  opportunities: OpportunityListItem[],
  query: string,
  limit = 10,
): OpportunityListItem[] {
  const q = query.trim().toLowerCase()
  if (!q) {
    return [...opportunities].slice(0, limit)
  }

  return opportunities
    .filter((o) => {
      const haystack = [
        o.name,
        o.company,
        o.contactName,
        o.owner,
        o.stage,
        o.amount,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
    .slice(0, limit)
}
