import { useEffect, useState } from 'react'

import { getDashboardApi } from '@/api/dashboard'
import { isApiEnabled } from '@/api/config'
import { getDashboardMock } from '@/data/dashboard.mock'
import {
  defaultDashboardPeriod,
  periodOptionId,
  type DashboardPeriod,
} from '@/lib/dashboard-period'
import type { DashboardData } from '@/types/dashboard'

export function useDashboardData(period: DashboardPeriod) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromApi, setFromApi] = useState(false)

  const periodKey = periodOptionId(period)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    if (isApiEnabled()) {
      void getDashboardApi(period)
        .then((snapshot) => {
          if (!cancelled) {
            setData(snapshot)
            setFromApi(true)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError('No se pudo cargar el dashboard.')
            setData(getDashboardMock(period))
            setFromApi(false)
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    } else {
      setData(getDashboardMock(period))
      setFromApi(false)
      setLoading(false)
    }

    return () => {
      cancelled = true
    }
  }, [periodKey])

  return {
    data,
    loading,
    error,
    fromApi,
  }
}

export { defaultDashboardPeriod }
