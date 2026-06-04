import { useEffect, useMemo, useState } from 'react'

export type RelatedListPageSize = 10 | 25 | 50

export function useRelatedListState<T>({
  items,
  searchFilter,
  query,
  defaultPageSize = 10,
}: {
  items: T[]
  searchFilter: (item: T, q: string) => boolean
  query: string
  defaultPageSize?: RelatedListPageSize
}) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<RelatedListPageSize>(defaultPageSize)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => searchFilter(item, q))
  }, [items, query, searchFilter])

  useEffect(() => {
    setPage(1)
  }, [query, pageSize, items.length])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, filtered.length)

  return {
    filtered,
    pageItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    rangeStart,
    rangeEnd,
    totalFiltered: filtered.length,
  }
}
