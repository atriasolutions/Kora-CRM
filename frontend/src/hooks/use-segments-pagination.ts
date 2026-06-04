import { useEffect, useMemo, useState } from 'react'

import { SEGMENTS_PAGE_SIZE } from '@/lib/large-dataset-view'

export function useSegmentsPagination<T>(
  items: T[],
  resetDeps: readonly unknown[],
  pageSize = SEGMENTS_PAGE_SIZE,
) {
  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage(0)
  }, [items.length, pageSize, ...resetDeps])

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages - 1)

  useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  const visible = useMemo(() => {
    const start = safePage * pageSize
    return items.slice(start, start + pageSize)
  }, [items, safePage, pageSize])

  const rangeFrom = total === 0 ? 0 : safePage * pageSize + 1
  const rangeTo = Math.min((safePage + 1) * pageSize, total)

  return {
    visible,
    page: safePage,
    setPage,
    totalPages,
    total,
    pageSize,
    rangeFrom,
    rangeTo,
    canPrev: safePage > 0,
    canNext: safePage < totalPages - 1,
  }
}
