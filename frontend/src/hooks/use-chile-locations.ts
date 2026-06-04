import { useEffect, useMemo, useState } from 'react'

import {
  getCommuneNames,
  getRegionNames,
  loadGeoCatalog,
} from '@/lib/geo-catalog-client'
import type { GeoCatalog } from '@/types/geo'

export function useChileLocations() {
  const [catalog, setCatalog] = useState<GeoCatalog | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void loadGeoCatalog().then((data) => {
      if (!cancelled) {
        setCatalog(data)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const regions = useMemo(
    () => (catalog ? getRegionNames(catalog) : []),
    [catalog],
  )

  const getCommunesForRegion = useMemo(() => {
    return (regionName: string) =>
      catalog ? getCommuneNames(catalog, regionName) : []
  }, [catalog])

  return { catalog, regions, getCommunesForRegion, loading }
}
