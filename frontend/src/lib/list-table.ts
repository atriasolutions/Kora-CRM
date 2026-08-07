import type { ListColumnDef, ListRowBase } from '@/types/list-module'

export type ListSortDirection = 'asc' | 'desc'

export type ListColumnPrefs = {
  hidden: Set<string>
  order: string[]
  widths: Record<string, number>
}

type StoredListColumnPrefsV2 = {
  v: 2
  hidden: string[]
  order: string[]
  widths: Record<string, number>
}

export const LIST_COL_MIN_WIDTH = 72
export const LIST_COL_MAX_WIDTH = 520
export const LIST_COL_DEFAULT_WIDTH = 140
export const LIST_TABLE_SELECTION_COL_WIDTH = 44
export const LIST_TABLE_ACTIONS_COL_WIDTH = 104

export function parseListTableMinWidth(value?: string | number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (!value) return 940
  const match = String(value).match(/(\d+)/)
  return match ? Number.parseInt(match[1]!, 10) : 940
}

export function computeListTableMinWidth(
  columnWidths: number[],
  configMinWidth?: string | number,
  options?: { includeActionsColumn?: boolean },
): number {
  const columnsTotal = columnWidths.reduce((sum, width) => sum + width, 0)
  const actionsWidth =
    options?.includeActionsColumn === false ? 0 : LIST_TABLE_ACTIONS_COL_WIDTH
  const floor = columnsTotal + LIST_TABLE_SELECTION_COL_WIDTH + actionsWidth
  return Math.max(floor, parseListTableMinWidth(configMinWidth))
}

export function listColumnKey(index: number, header: string): string {
  return `${index}:${header}`
}

export function parseWidthFromClassName(className?: string): number | undefined {
  const match = className?.match(/(?:min-)?w-\[(\d+)px\]/)
  return match ? Number.parseInt(match[1]!, 10) : undefined
}

export function getListCellText<T extends ListRowBase>(
  row: T,
  col: ListColumnDef<T>,
): string {
  switch (col.kind) {
    case 'primary':
      return col.title(row)
    case 'text':
      return col.cell(row)
    case 'badge':
      return col.label(row)
    case 'custom':
      return '—'
    default:
      return ''
  }
}

export function isColumnSortable<T extends ListRowBase>(col: ListColumnDef<T>): boolean {
  if (col.kind === 'primary' || col.kind === 'text' || col.kind === 'badge') {
    return col.sortable === true
  }
  return false
}

/** `sortBy` para la API; undefined = orden solo en cliente. */
export function getColumnSortKey<T extends ListRowBase>(
  col: ListColumnDef<T>,
): string | undefined {
  if (col.kind === 'primary' || col.kind === 'text' || col.kind === 'badge') {
    return col.sortKey?.trim() || undefined
  }
  return undefined
}

export function getColumnSortValue<T extends ListRowBase>(
  row: T,
  col: ListColumnDef<T>,
): string {
  if (col.kind === 'primary' || col.kind === 'text' || col.kind === 'badge') {
    if ('sortValue' in col && typeof col.sortValue === 'function') {
      return String(col.sortValue(row)).toLowerCase()
    }
  }
  return getListCellText(row, col).toLowerCase()
}

export function compareRowsByColumn<T extends ListRowBase>(
  a: T,
  b: T,
  col: ListColumnDef<T>,
  direction: ListSortDirection,
): number {
  const av = getColumnSortValue(a, col)
  const bv = getColumnSortValue(b, col)
  const cmp = av.localeCompare(bv, 'es', { sensitivity: 'base', numeric: true })
  return direction === 'asc' ? cmp : -cmp
}

export function moveColumnKey(
  order: string[],
  key: string,
  direction: 'up' | 'down',
): string[] {
  const index = order.indexOf(key)
  if (index < 0) return order
  const swapWith = direction === 'up' ? index - 1 : index + 1
  if (swapWith < 0 || swapWith >= order.length) return order
  const next = [...order]
  ;[next[index], next[swapWith]] = [next[swapWith]!, next[index]!]
  return next
}

export function normalizeColumnOrder(
  order: string[],
  allKeys: string[],
): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const key of order) {
    if (allKeys.includes(key) && !seen.has(key)) {
      normalized.push(key)
      seen.add(key)
    }
  }
  for (const key of allKeys) {
    if (!seen.has(key)) normalized.push(key)
  }
  return normalized
}

export function loadListColumnPrefs(
  storageKey: string,
  allKeys: string[],
  defaultWidths: Record<string, number>,
  defaultHiddenKeys: string[] = [],
): ListColumnPrefs {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      return {
        hidden: new Set(defaultHiddenKeys.filter((k) => allKeys.includes(k))),
        order: [...allKeys],
        widths: { ...defaultWidths },
      }
    }

    const parsed = JSON.parse(raw) as StoredListColumnPrefsV2 | string[]

    if (Array.isArray(parsed)) {
      return {
        hidden: new Set(parsed),
        order: [...allKeys],
        widths: { ...defaultWidths },
      }
    }

    if (parsed && typeof parsed === 'object' && parsed.v === 2) {
      return {
        hidden: new Set(parsed.hidden ?? []),
        order: normalizeColumnOrder(parsed.order ?? [], allKeys),
        widths: { ...defaultWidths, ...(parsed.widths ?? {}) },
      }
    }
  } catch {
    /* ignore */
  }

  return {
    hidden: new Set(defaultHiddenKeys.filter((k) => allKeys.includes(k))),
    order: [...allKeys],
    widths: { ...defaultWidths },
  }
}

export function saveListColumnPrefs(storageKey: string, prefs: ListColumnPrefs) {
  try {
    const payload: StoredListColumnPrefsV2 = {
      v: 2,
      hidden: [...prefs.hidden],
      order: prefs.order,
      widths: prefs.widths,
    }
    localStorage.setItem(storageKey, JSON.stringify(payload))
  } catch {
    /* private mode */
  }
}

/** @deprecated Usar loadListColumnPrefs */
export function loadHiddenColumnKeys(storageKey: string): Set<string> {
  return loadListColumnPrefs(storageKey, [], {}).hidden
}

/** @deprecated Usar saveListColumnPrefs */
export function saveHiddenColumnKeys(storageKey: string, hidden: Set<string>) {
  saveListColumnPrefs(storageKey, {
    hidden,
    order: [],
    widths: {},
  })
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function buildCsvContent(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ]
  return `\uFEFF${lines.join('\n')}`
}

export function downloadCsvFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function clampColumnWidth(width: number): number {
  return Math.min(LIST_COL_MAX_WIDTH, Math.max(LIST_COL_MIN_WIDTH, width))
}
