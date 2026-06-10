import { useEffect, useState } from 'react'

import { fetchBitacoraDashboardApi } from '@/api/bitacora'
import { isApiEnabled } from '@/api/config'
import type { BitacoraListItem } from '@/data/bitacora.mock'
import {
  bitacoraFiltersToDashboardQuery,
  computeBitacoraDashboardStats,
} from '@/lib/bitacora-dashboard'
import type { BitacoraFilters } from '@/lib/bitacora-filters'
import { bitacoraMatchesListScope, type BitacoraListScope } from '@/lib/bitacora-list-scope'
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
  const [error, setError] = useState<string | null>(null)
  const [fromApi, setFromApi] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

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
          setError('No se pudo cargar el resumen de bitácora.')
          const scopedRows = rows.filter((row) =>
            bitacoraMatchesListScope(row, listScope, recentIds),
          )
          setStats(computeBitacoraDashboardStats(scopedRows, filters))
          setFromApi(false)
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

  return { stats, loading, error, fromApi }
}
