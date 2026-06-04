import { useState, type ReactNode } from 'react'

import { ModuleSearchField } from '@/components/list/ModuleSearchField'
import { RelatedListPager } from '@/components/shared/RelatedListPager'
import {
  useRelatedListState,
  type RelatedListPageSize,
} from '@/lib/use-related-list-state'

type RelatedEntityListProps<T> = {
  items: T[]
  searchPlaceholder?: string
  searchFilter: (item: T, q: string) => boolean
  pageSizeOptions?: RelatedListPageSize[]
  defaultPageSize?: RelatedListPageSize
  emptyMessage?: string
  noMatchMessage?: string
  renderItem: (item: T) => ReactNode
  className?: string
  hideSearch?: boolean
  hidePager?: boolean
}

export function RelatedEntityList<T>({
  items,
  searchPlaceholder = 'Buscar…',
  searchFilter,
  pageSizeOptions = [10, 25, 50],
  defaultPageSize = 10,
  emptyMessage = 'No hay registros relacionados.',
  noMatchMessage = 'Sin coincidencias para la búsqueda.',
  renderItem,
  className,
  hideSearch = false,
  hidePager = false,
}: RelatedEntityListProps<T>) {
  const [query, setQuery] = useState('')
  const {
    pageItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    rangeStart,
    rangeEnd,
    totalFiltered,
  } = useRelatedListState({
    items,
    searchFilter,
    query,
    defaultPageSize,
  })

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div className={className ?? 'space-y-3'}>
      {!hideSearch ? (
        <ModuleSearchField
          value={query}
          onChange={setQuery}
          placeholder={searchPlaceholder}
          ariaLabel={searchPlaceholder}
          className="max-w-md"
        />
      ) : null}

      {totalFiltered === 0 ? (
        <p className="text-sm text-muted-foreground">{noMatchMessage}</p>
      ) : (
        <ul className="space-y-2">{pageItems.map((item) => renderItem(item))}</ul>
      )}

      {!hidePager ? (
        <RelatedListPager
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          total={totalFiltered}
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      ) : null}
    </div>
  )
}
