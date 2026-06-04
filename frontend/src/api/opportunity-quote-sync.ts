import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { ApiItemResponse } from '@/api/types'
import type { OpportunityDetail } from '@/data/opportunity-detail.mock'

export async function syncOpportunityFromQuoteApi(
  opportunityId: string,
  quoteId: string,
): Promise<OpportunityDetail> {
  const res = await fetchJSON<ApiItemResponse<OpportunityDetail>>(
    `${API_V1}/opportunities/${opportunityId}/sync-quote`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId }),
    },
  )
  return res.data
}
