import { useEffect, useState } from 'react'

import { fetchBitacoraDashboardApi } from '@/api/bitacora'
import { isApiEnabled } from '@/api/config'
import type { BitacoraListItem } from '@/data/bitacora.mock'
import {
  bitacoraFiltersToDashboardQuery,
  computeBitacoraDashboardStats,
} from '@/lib/bitacora-dashboard'
import { labelForBitacoraDateFilter } from '@/lib/bitacora-date-filter'
import type { BitacoraFilters } from '@/lib/bitacora-filters'
import { bitacoraMatchesListScope, type BitacoraListScope } from '@/lib/bitacora-list-scope'
import { emptyBitacoraDashboardStats } from '@/lib/production-empty-data'
import type { BitacoraDashboardStats } from '@/types/bitacora-dashboard'

type UseBitacoraDashboardOptions = {
  filters: BitacoraFilters
  listScope: BitacoraListScope
  recentIds: string[]
  rows: BitacoraListItem[]
  resetKey: string
}

export function useBitacoraDashboard({
  filters,
  listScope,
  recentIds,
  rows,
  resetKey,
}: UseBitacoraDashboardOptions) {
  const [stats, setStats] = useState<BitacoraDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [fromApi, setFromApi] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      try {
        if (isApiEnabled()) {
          const data = await fetchBitacoraDashboardApi(
            bitacoraFiltersToDashboardQuery(filters, listScope === 'mine'),
          )
          if (!cancelled) {
            setStats(data)
            setFromApi(true)
          }
          return
        }

        const scopedRows = rows.filter((row) =>
          bitacoraMatchesListScope(row, listScope, recentIds),
        )
        const data = computeBitacoraDashboardStats(scopedRows, filters)
        if (!cancelled) {
          setStats(data)
          setFromApi(false)
        }
      } catch {
        if (!cancelled) {
          setStats(
            emptyBitacoraDashboardStats(labelForBitacoraDateFilter(filters.date)),
          )
          setFromApi(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [filters, listScope, recentIds, rows, resetKey])

  return { stats, loading, fromApi }
}
