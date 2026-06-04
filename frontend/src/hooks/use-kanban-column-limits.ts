import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  KANBAN_COLUMN_INITIAL_LIMIT,
  KANBAN_COLUMN_LOAD_STEP,
} from '@/lib/large-dataset-view'

export function useKanbanColumnLimits(
  columnKeys: readonly string[],
  resetDeps: readonly unknown[],
) {
  const keysKey = columnKeys.join('\0')

  const initialLimits = useMemo(
    () =>
      Object.fromEntries(
        columnKeys.map((k) => [k, KANBAN_COLUMN_INITIAL_LIMIT]),
      ) as Record<string, number>,
    [keysKey],
  )

  const [limits, setLimits] = useState<Record<string, number>>(initialLimits)

  useEffect(() => {
    setLimits(initialLimits)
  }, [keysKey, ...resetDeps])

  const sliceForColumn = useCallback(
    <T,>(columnKey: string, items: T[]): T[] => {
      const limit = limits[columnKey] ?? KANBAN_COLUMN_INITIAL_LIMIT
      return items.slice(0, limit)
    },
    [limits],
  )

  const loadMoreForColumn = useCallback((columnKey: string) => {
    setLimits((prev) => ({
      ...prev,
      [columnKey]:
        (prev[columnKey] ?? KANBAN_COLUMN_INITIAL_LIMIT) + KANBAN_COLUMN_LOAD_STEP,
    }))
  }, [])

  const hiddenInColumn = useCallback(
    (columnKey: string, total: number): number => {
      const limit = limits[columnKey] ?? KANBAN_COLUMN_INITIAL_LIMIT
      return Math.max(0, total - limit)
    },
    [limits],
  )

  const hasMoreInColumn = useCallback(
    (columnKey: string, total: number): boolean => hiddenInColumn(columnKey, total) > 0,
    [hiddenInColumn],
  )

  return {
    sliceForColumn,
    loadMoreForColumn,
    hiddenInColumn,
    hasMoreInColumn,
  }
}
