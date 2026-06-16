import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { ApiItemResponse } from '@/api/types'
import type { DashboardData, DashboardViewId } from '@/types/dashboard'
import { periodToQuery, type DashboardPeriod } from '@/lib/dashboard-period'

const BASE = `${API_V1}/dashboard`

export async function getDashboardApi(
  period: DashboardPeriod,
  view: DashboardViewId = 'ventas',
): Promise<DashboardData> {
  const params = new URLSearchParams(periodToQuery(period))
  params.set('view', view)
  const res = await fetchJSON<ApiItemResponse<DashboardData>>(`${BASE}?${params.toString()}`)
  return res.data
}
