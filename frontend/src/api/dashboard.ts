import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { ApiItemResponse } from '@/api/types'
import type { DashboardData } from '@/types/dashboard'
import { periodToQuery, type DashboardPeriod } from '@/lib/dashboard-period'

const BASE = `${API_V1}/dashboard`

export async function getDashboardApi(period: DashboardPeriod): Promise<DashboardData> {
  const res = await fetchJSON<ApiItemResponse<DashboardData>>(
    `${BASE}?${periodToQuery(period)}`,
  )
  return res.data
}
