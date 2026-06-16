import { useEffect, useState } from 'react'

import { getDashboardApi } from '@/api/dashboard'
import { isApiEnabled } from '@/api/config'
import { getDashboardMock } from '@/data/dashboard.mock'
import { getEmptyDashboard } from '@/lib/dashboard-empty'
import {
  defaultDashboardPeriod,
  periodOptionId,
  type DashboardPeriod,
} from '@/lib/dashboard-period'
import type { DashboardData, DashboardViewId } from '@/types/dashboard'

export function useDashboardData(period: DashboardPeriod, view: DashboardViewId = 'ventas') {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fromApi, setFromApi] = useState(false)

  const periodKey = periodOptionId(period)
  const viewKey = view

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    if (isApiEnabled()) {
      void getDashboardApi(period, view)
        .then((snapshot) => {
          if (!cancelled) {
            setData(snapshot)
            setFromApi(true)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setData(getEmptyDashboard(period, view))
            setFromApi(true)
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    } else {
      setData(getDashboardMock(period, view))
      setFromApi(false)
      setLoading(false)
    }

    return () => {
      cancelled = true
    }
  }, [periodKey, viewKey, period, view])

  return {
    data,
    loading,
    fromApi,
  }
}

export { defaultDashboardPeriod }
