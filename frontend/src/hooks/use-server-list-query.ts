import { useCallback, useEffect, useRef, useState } from 'react'

import { isConnectionError } from '@/api/errors'

export type ServerListFetchParams = {
  page: number
  pageSize: number
  query: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

export type ServerListFetchResult<T> = {
  rows: T[]
  total: number
}

type UseServerListQueryOptions<T> = {
  fetchPage: (params: ServerListFetchParams) => Promise<ServerListFetchResult<T>>
  page: number
  pageSize: number
  query: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  /** Reinicia a página 1 cuando cambia (filtros externos). */
  resetKey?: unknown
  enabled?: boolean
}

export function useServerListQuery<T>({
  fetchPage,
  page,
  pageSize,
  query,
  sortBy,
  sortDir,
  resetKey,
  enabled = true,
}: UseServerListQueryOptions<T>) {
  const [rows, setRows] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [connectionError, setConnectionError] = useState(false)
  const fetchRef = useRef(fetchPage)
  fetchRef.current = fetchPage

  const reload = useCallback(() => {
    setRows([])
    setLoading(true)
  }, [])

  useEffect(() => {
    if (!enabled) {
      setRows([])
      setTotal(0)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setConnectionError(false)

    void fetchRef
      .current({ page, pageSize, query, sortBy, sortDir })
      .then((result) => {
        if (cancelled) return
        setRows(result.rows)
        setTotal(result.total)
        setLoading(false)
      })
      .catch((error) => {
        if (cancelled) return
        setRows([])
        setTotal(0)
        setLoading(false)
        setConnectionError(isConnectionError(error))
      })

    return () => {
      cancelled = true
    }
  }, [enabled, page, pageSize, query, sortBy, sortDir, resetKey])

  return { rows, total, loading, connectionError, reload }
}
