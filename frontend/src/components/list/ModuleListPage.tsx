import {
  Archive,
  ClipboardCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Upload,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

import { ListPageLayout } from '@/components/list/ListPageLayout'
import { ListTableToolbar } from '@/components/list/ListTableToolbar'
import { ResizableTableHeadCell } from '@/components/list/ResizableTableHeadCell'
import { ListPrimaryUserAvatar } from '@/components/shared/ListPrimaryUserAvatar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { EntityAvatarImage } from '@/components/shared/EntityAvatarImage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { STORAGE_PREFIX } from '@/config/brand'
import { contactDisplayPhone } from '@/lib/contact-form'
import { getEmailHref } from '@/lib/email'
import { getTelHref } from '@/lib/phone'
import type { ContactListItem } from '@/data/contacts.mock'
import type { ListRowBase, ModuleListConfig } from '@/types/list-module'
import {
  buildCsvContent,
  compareRowsByColumn,
  downloadCsvFile,
  getListCellText,
  isColumnSortable,
  listColumnKey,
  LIST_COL_DEFAULT_WIDTH,
  LIST_TABLE_ACTIONS_COL_WIDTH,
  LIST_TABLE_SELECTION_COL_WIDTH,
  computeListTableMinWidth,
  loadListColumnPrefs,
  parseWidthFromClassName,
  saveListColumnPrefs,
  type ListSortDirection,
} from '@/lib/list-table'
import { cn } from '@/lib/utils'
import { useServerListQuery } from '@/hooks/use-server-list-query'
import type {
  ServerListFetchParams,
  ServerListFetchResult,
} from '@/hooks/use-server-list-query'
import { isApiEnabled } from '@/api/config'

function rowsForPage<T extends ListRowBase>(
  seeds: T[],
  page: number,
  pageSize: number,
  idPrefix: string,
): T[] {
  const start = (page - 1) * pageSize
  if (seeds.length === 0) return []
  return Array.from({ length: pageSize }, (_, rowIdx) => {
    const globalIdx = start + rowIdx
    const seed = seeds[globalIdx % seeds.length]
    return { ...seed, id: `${idPrefix}-${globalIdx}` }
  })
}

function defaultInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

export type ListSelectionAction = {
  label: string
  icon?: typeof Archive
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
  onClick: (selectedIds: string[]) => void
}

export type ServerListConfig<T> = {
  fetchPage: (params: ServerListFetchParams) => Promise<ServerListFetchResult<T>>
  /** Cambia cuando filtros externos deben recargar desde página 1. */
  resetKey?: unknown
  enabled?: boolean
}

type ModuleListPageProps<T extends ListRowBase> = {
  config: ModuleListConfig<T>
  /** Oculta cabecera, tabs y búsqueda (p. ej. página de contactos con header propio). */
  embedded?: boolean
  /** Búsqueda controlada desde el padre cuando `embedded` es true. */
  searchQuery?: string
  /** Contactos añadidos por el usuario (aparecen al inicio de la lista). */
  extraSeeds?: T[]
  /** Filtro adicional (p. ej. estado, último contacto). */
  rowPredicate?: (row: T) => boolean
  /** Normaliza cada fila antes de mostrarla (p. ej. overrides guardados). */
  resolveRow?: (row: T) => T
  onEditRow?: (row: T) => void
  onArchiveRow?: (row: T) => void
  /** Registrar intento de contacto (solo filas de contacto). */
  onLogOutreachRow?: (row: T) => void
  /** Orden final tras filtros (p. ej. vistos recientemente). */
  postFilterSort?: (rows: T[]) => T[]
  /** Acciones cuando hay filas seleccionadas (p. ej. archivar en lote). */
  selectionActions?: ListSelectionAction[]
  /** Al cambiar, limpia la selección (p. ej. tras archivar en lote). */
  clearSelectionKey?: number
  /** Paginación server-side (API); evita cargar todo el catálogo en memoria. */
  serverList?: ServerListConfig<T>
  /** Contenedor en el header del módulo; la toolbar se renderiza vía portal. */
  toolbarHost?: HTMLElement | null
}

export function ModuleListPage<T extends ListRowBase>({
  config,
  embedded = false,
  searchQuery,
  extraSeeds = [],
  rowPredicate,
  resolveRow,
  onEditRow,
  onArchiveRow,
  onLogOutreachRow,
  postFilterSort,
  selectionActions,
  clearSelectionKey,
  serverList,
  toolbarHost,
}: ModuleListPageProps<T>) {
  const {
    title,
    description,
    entityPlural,
    newItemLabel,
    total,
    seeds,
    searchFilter,
    columns,
    viewModes = [
      { id: 'lista', label: 'Lista', Icon: List },
      { id: 'kanban', label: 'Kanban', Icon: LayoutGrid },
    ],
  showImport = true,
  minTableWidth = '940px',
  rowActions = 'default',
  showRowActions = true,
  alternateViewMessage,
  getDetailPath,
} = config

  const navigate = useNavigate()
  const [view, setView] = useState(viewModes[0]?.id ?? 'lista')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [internalQuery, setInternalQuery] = useState('')
  const query = embedded && searchQuery !== undefined ? searchQuery : internalQuery
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const columnStorageKey = `${STORAGE_PREFIX}-list-columns-${entityPlural}`
  const primaryColumnIndex = columns.findIndex((c) => c.kind === 'primary')

  const columnMeta = useMemo(
    () =>
      columns.map((col, index) => ({
        key: listColumnKey(index, col.header),
        header: col.header,
        col,
        locked: col.kind === 'primary' && index === primaryColumnIndex,
        defaultWidth:
          parseWidthFromClassName(col.className) ?? LIST_COL_DEFAULT_WIDTH,
      })),
    [columns, primaryColumnIndex],
  )

  const allColumnKeys = useMemo(() => columnMeta.map((m) => m.key), [columnMeta])

  const defaultWidths = useMemo(
    () =>
      Object.fromEntries(columnMeta.map((m) => [m.key, m.defaultWidth])) as Record<
        string,
        number
      >,
    [columnMeta],
  )

  const [columnPrefs, setColumnPrefs] = useState(() =>
    loadListColumnPrefs(columnStorageKey, allColumnKeys, defaultWidths),
  )

  const [sort, setSort] = useState<{
    key: string
    direction: ListSortDirection
  } | null>(null)

  const useServerMode = Boolean(serverList && isApiEnabled())

  const serverQuery = useServerListQuery<T>({
    fetchPage: serverList?.fetchPage ?? (async () => ({ rows: [], total: 0 })),
    page,
    pageSize,
    query,
    resetKey: serverList?.resetKey,
    enabled: useServerMode && serverList?.enabled !== false,
  })

  const persistColumnPrefs = useCallback(
    (next: typeof columnPrefs) => {
      setColumnPrefs(next)
      saveListColumnPrefs(columnStorageKey, next)
    },
    [columnStorageKey],
  )

  const orderedColumnMeta = useMemo(() => {
    const map = new Map(columnMeta.map((m) => [m.key, m]))
    return columnPrefs.order
      .map((key) => map.get(key))
      .filter((m): m is (typeof columnMeta)[number] => Boolean(m))
  }, [columnMeta, columnPrefs.order])

  const visibleColumnEntries = useMemo(
    () => orderedColumnMeta.filter((m) => !columnPrefs.hidden.has(m.key)),
    [orderedColumnMeta, columnPrefs.hidden],
  )

  const computedTableMinWidth = useMemo(
    () =>
      computeListTableMinWidth(
        visibleColumnEntries.map(
          ({ key }) => columnPrefs.widths[key] ?? LIST_COL_DEFAULT_WIDTH,
        ),
        minTableWidth,
        { includeActionsColumn: showRowActions },
      ),
    [visibleColumnEntries, columnPrefs.widths, minTableWidth, showRowActions],
  )

  const columnOptions = useMemo(() => {
    const visibleKeys = orderedColumnMeta
      .filter((m) => !columnPrefs.hidden.has(m.key))
      .map((m) => m.key)
    return orderedColumnMeta.map((m) => {
      const visibleIndex = visibleKeys.indexOf(m.key)
      return {
        key: m.key,
        header: m.header,
        visible: !columnPrefs.hidden.has(m.key),
        locked: m.locked,
        canMoveUp: visibleIndex > 0,
        canMoveDown: visibleIndex >= 0 && visibleIndex < visibleKeys.length - 1,
      }
    })
  }, [orderedColumnMeta, columnPrefs.hidden])

  const toggleColumn = useCallback(
    (key: string) => {
      const meta = columnMeta.find((m) => m.key === key)
      if (meta?.locked) return

      const nextHidden = new Set(columnPrefs.hidden)
      if (nextHidden.has(key)) {
        nextHidden.delete(key)
      } else {
        const visibleCount = columnMeta.filter((m) => !columnPrefs.hidden.has(m.key)).length
        if (visibleCount <= 1) return
        nextHidden.add(key)
      }
      persistColumnPrefs({ ...columnPrefs, hidden: nextHidden })
    },
    [columnMeta, columnPrefs, persistColumnPrefs],
  )

  const moveColumn = useCallback(
    (key: string, direction: 'up' | 'down') => {
      const visibleKeys = orderedColumnMeta
        .filter((m) => !columnPrefs.hidden.has(m.key))
        .map((m) => m.key)
      const visibleIndex = visibleKeys.indexOf(key)
      if (visibleIndex < 0) return

      const swapWith = direction === 'up' ? visibleIndex - 1 : visibleIndex + 1
      if (swapWith < 0 || swapWith >= visibleKeys.length) return

      const nextVisible = [...visibleKeys]
      ;[nextVisible[visibleIndex], nextVisible[swapWith]] = [
        nextVisible[swapWith]!,
        nextVisible[visibleIndex]!,
      ]

      const hiddenKeys = orderedColumnMeta
        .filter((m) => columnPrefs.hidden.has(m.key))
        .map((m) => m.key)

      persistColumnPrefs({
        ...columnPrefs,
        order: [...nextVisible, ...hiddenKeys],
      })
    },
    [columnPrefs, orderedColumnMeta, persistColumnPrefs],
  )

  const setColumnWidth = useCallback(
    (key: string, width: number) => {
      persistColumnPrefs({
        ...columnPrefs,
        widths: { ...columnPrefs.widths, [key]: width },
      })
    },
    [columnPrefs, persistColumnPrefs],
  )

  const toggleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, direction: 'asc' }
      if (prev.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }, [])

  const resetColumns = useCallback(() => {
    const reset = {
      hidden: new Set<string>(),
      order: [...allColumnKeys],
      widths: { ...defaultWidths },
    }
    persistColumnPrefs(reset)
    setSort(null)
  }, [allColumnKeys, defaultWidths, persistColumnPrefs])

  useEffect(() => {
    queueMicrotask(() => setPage(1))
  }, [query, rowPredicate, sort, serverList?.resetKey])

  useEffect(() => {
    if (serverQuery.connectionError) {
      queueMicrotask(() => setPage(1))
    }
  }, [serverQuery.connectionError])

  useEffect(() => {
    queueMicrotask(() => setSelected(new Set()))
  }, [clearSelectionKey, query, rowPredicate])

  /** Listas embebidas (p. ej. Contactos con API): solo datos del registry, sin relleno demo. */
  const registryOnly = embedded && !useServerMode
  const listTotal = useServerMode
    ? serverQuery.total
    : registryOnly
      ? extraSeeds.length
      : total + extraSeeds.length
  const idPrefix = entityPlural.replace(/\s+/g, '-')

  const allRows = useMemo(() => {
    if (registryOnly) {
      return extraSeeds
    }
    if (extraSeeds.length === 0) {
      return Array.from({ length: listTotal }, (_, globalIdx) => {
        const seed = seeds[globalIdx % seeds.length]!
        return { ...seed, id: `${idPrefix}-${globalIdx}` }
      })
    }
    return Array.from({ length: listTotal }, (_, globalIdx) => {
      if (globalIdx < extraSeeds.length) return extraSeeds[globalIdx]!
      const demoIdx = globalIdx - extraSeeds.length
      const seed = seeds[demoIdx % seeds.length]!
      return { ...seed, id: `${idPrefix}-${demoIdx}` }
    })
  }, [registryOnly, extraSeeds, seeds, listTotal, idPrefix])

  const applyResolveRow = useCallback(
    (rows: T[]) => (resolveRow ? rows.map((row) => resolveRow(row)) : rows),
    [resolveRow],
  )

  const filteredAll = useMemo(() => {
    let rows: T[] = useServerMode ? serverQuery.rows : allRows
    if (!useServerMode) {
      const q = query.trim().toLowerCase()
      if (q) rows = rows.filter((row) => searchFilter(row, q))
    }
    if (rowPredicate) rows = rows.filter(rowPredicate)

    if (sort) {
      const meta = columnMeta.find((m) => m.key === sort.key)
      if (meta && isColumnSortable(meta.col)) {
        rows = [...rows].sort((a, b) =>
          compareRowsByColumn(a, b, meta.col, sort.direction),
        )
      }
    }

    const resolved = applyResolveRow(rows)
    return postFilterSort ? postFilterSort(resolved) : resolved
  }, [
    useServerMode,
    serverQuery.rows,
    allRows,
    query,
    searchFilter,
    rowPredicate,
    sort,
    columnMeta,
    applyResolveRow,
    postFilterSort,
  ])

  const exportRowCount = useServerMode ? serverQuery.total : filteredAll.length

  const useFilteredPagination =
    (!useServerMode && embedded) || (!useServerMode && rowPredicate !== undefined)
  const effectiveTotal = useServerMode
    ? serverQuery.total
    : useFilteredPagination
      ? filteredAll.length
      : listTotal
  const pageCount = Math.max(1, Math.ceil(effectiveTotal / pageSize))

  const pageRows = useMemo(() => {
    if (useServerMode) {
      let rows = serverQuery.rows
      if (rowPredicate) rows = rows.filter(rowPredicate)
      if (sort) {
        const meta = columnMeta.find((m) => m.key === sort.key)
        if (meta && isColumnSortable(meta.col)) {
          rows = [...rows].sort((a, b) =>
            compareRowsByColumn(a, b, meta.col, sort.direction),
          )
        }
      }
      return applyResolveRow(postFilterSort ? postFilterSort(rows) : rows)
    }
    if (useFilteredPagination) {
      const start = (page - 1) * pageSize
      return filteredAll.slice(start, start + pageSize)
    }
    if (registryOnly) {
      const start = (page - 1) * pageSize
      return extraSeeds.slice(start, start + pageSize)
    }
    if (extraSeeds.length === 0) {
      return rowsForPage(seeds, page, pageSize, idPrefix)
    }
    const start = (page - 1) * pageSize
    return Array.from({ length: pageSize }, (_, rowIdx) => {
      const globalIdx = start + rowIdx
      if (globalIdx >= listTotal) return null
      if (globalIdx < extraSeeds.length) return extraSeeds[globalIdx]!
      const demoIdx = globalIdx - extraSeeds.length
      const seed = seeds[demoIdx % seeds.length]!
      return { ...seed, id: `${idPrefix}-${demoIdx}` }
    }).filter((row): row is T => row !== null)
  }, [
    useServerMode,
    serverQuery.rows,
    useFilteredPagination,
    registryOnly,
    filteredAll,
    page,
    pageSize,
    extraSeeds,
    seeds,
    listTotal,
    idPrefix,
    rowPredicate,
    sort,
    columnMeta,
    applyResolveRow,
    postFilterSort,
  ])

  const filteredRows = useMemo(() => {
    if (useFilteredPagination) return pageRows
    const q = query.trim().toLowerCase()
    const rows = !q ? pageRows : pageRows.filter((row) => searchFilter(row, q))
    if (useServerMode) return rows
    return applyResolveRow(rows)
  }, [useFilteredPagination, useServerMode, pageRows, query, searchFilter, applyResolveRow])

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleAllVisible = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      filteredRows.forEach((row) => {
        if (checked) next.add(row.id)
        else next.delete(row.id)
      })
      return next
    })
  }

  const allVisibleSelected =
    filteredRows.length > 0 && filteredRows.every((row) => selected.has(row.id))

  const rangeStart =
    effectiveTotal === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, effectiveTotal)
  const colSpan = visibleColumnEntries.length + 1 + (showRowActions ? 1 : 0)

  const handleExport = useCallback(() => {
    if (exportRowCount === 0) return

    const headers = visibleColumnEntries.map((m) => m.header)
    const rows = filteredAll.map((row) =>
      visibleColumnEntries.map((m) => getListCellText(row, m.col)),
    )
    const date = new Date().toISOString().slice(0, 10)
    const filename = `${entityPlural}-${date}.csv`
    downloadCsvFile(filename, buildCsvContent(headers, rows))
  }, [exportRowCount, filteredAll, visibleColumnEntries, entityPlural])

  const embeddedToolbar = useMemo(
    () =>
      embedded ? (
        <ListTableToolbar
          columns={columnOptions}
          onToggleColumn={toggleColumn}
          onMoveColumn={moveColumn}
          onResetColumns={resetColumns}
          onExport={handleExport}
          exportDisabled={exportRowCount === 0}
          exportLabel={`Descargar ${entityPlural} (CSV)`}
        />
      ) : null,
    [
      embedded,
      columnOptions,
      toggleColumn,
      moveColumn,
      resetColumns,
      handleExport,
      exportRowCount,
      entityPlural,
    ],
  )

  const pagerPages = () => {
    const maxButtons = 5
    let start = Math.max(1, page - Math.floor(maxButtons / 2))
    const end = Math.min(pageCount, start + maxButtons - 1)
    start = Math.max(1, end - maxButtons + 1)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  const primaryTitle = (row: T) => {
    const col = columns.find((c) => c.kind === 'primary')
    return col?.kind === 'primary' ? col.title(row) : row.id
  }

  const alternateLabel =
    viewModes.find((v) => v.id === view)?.label ?? view

  const pages = pagerPages()

  const openDetail = (row: T) => {
    const path = getDetailPath?.(row)
    if (path) navigate(path)
  }

  const showAlternateView = !embedded && view !== 'lista'
  const rootClassName = embedded
    ? toolbarHost
      ? 'min-w-0 space-y-4'
      : 'min-w-0 space-y-5'
    : 'min-w-0 space-y-5'

  const moduleListHeader = (
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          {viewModes.length > 1 ? (
            <div
              className="inline-flex shrink-0 rounded-xl border border-border bg-muted/50 p-1"
              role="tablist"
              aria-label={`Vista de ${title}`}
            >
              {viewModes.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={view === id}
                  onClick={() => setView(id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    view === id
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon aria-hidden className="size-4 opacity-70" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          {showImport ? (
            <Button variant="outline" size="sm" className="border-border shadow-sm">
              <Upload aria-hidden className="size-4" />
              Importar
            </Button>
          ) : null}
          <Button variant="outline" size="sm" className="border-border shadow-sm">
            <Filter aria-hidden className="size-4" />
            Filtros
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="shadow-sm">
                <Plus aria-hidden className="size-4" />
                {newItemLabel}
                <ChevronDown aria-hidden className="size-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>Crear nuevo</DropdownMenuItem>
              <DropdownMenuItem>Duplicar existente</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Importar archivo</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
  )

  const moduleListBody = showAlternateView ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <LayoutGrid aria-hidden className="mb-3 size-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Vista «{alternateLabel}» en desarrollo.
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {alternateViewMessage ??
              'Usa la vista lista por ahora; luego se conectará con tu API Express.'}
          </p>
          <Button
            variant="outline"
            className="mt-6"
            type="button"
            onClick={() => setView('lista')}
          >
            Volver a lista
          </Button>
        </div>
      ) : (
        <div className="min-w-0 space-y-5">
        <>
          {embedded && !toolbarHost ? (
            <div className="flex justify-end">
              <ListTableToolbar
                columns={columnOptions}
                onToggleColumn={toggleColumn}
                onMoveColumn={moveColumn}
                onResetColumns={resetColumns}
                onExport={handleExport}
                exportDisabled={exportRowCount === 0}
                exportLabel={`Descargar ${entityPlural} (CSV)`}
              />
            </div>
          ) : null}
          {!embedded ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative min-w-[200px] max-w-lg flex-1">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  aria-label={`Buscar ${entityPlural}`}
                  className="h-10 bg-card ps-10 shadow-sm"
                  placeholder={`Buscar ${entityPlural}…`}
                  type="search"
                  value={query}
                  onChange={(e) => setInternalQuery(e.target.value)}
                />
              </div>
              <ListTableToolbar
                columns={columnOptions}
                onToggleColumn={toggleColumn}
                onMoveColumn={moveColumn}
                onResetColumns={resetColumns}
                onExport={handleExport}
                exportDisabled={exportRowCount === 0}
                exportLabel={`Descargar ${entityPlural} (CSV)`}
              />
            </div>
          ) : null}

          {selected.size > 0 && selectionActions && selectionActions.length > 0 ? (
            <div
              className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              role="status"
              aria-live="polite"
            >
              <p className="text-sm font-medium text-foreground">
                {selected.size} seleccionado{selected.size === 1 ? '' : 's'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {selectionActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <Button
                      key={action.label}
                      type="button"
                      size="sm"
                      variant={action.variant ?? 'outline'}
                      className={
                        action.variant === 'destructive'
                          ? undefined
                          : 'border-border bg-card shadow-sm'
                      }
                      onClick={() => action.onClick([...selected])}
                    >
                      {Icon ? <Icon aria-hidden className="size-4" /> : null}
                      {action.label}
                    </Button>
                  )
                })}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => setSelected(new Set())}
                >
                  Cancelar selección
                </Button>
              </div>
            </div>
          ) : null}

          <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto overscroll-x-contain">
              <table
                className="border-collapse text-sm"
                style={{
                  width: '100%',
                  minWidth: computedTableMinWidth,
                }}
              >
                <colgroup>
                  <col style={{ width: LIST_TABLE_SELECTION_COL_WIDTH }} />
                  {visibleColumnEntries.map(({ key }) => (
                    <col
                      key={key}
                      style={{
                        width: columnPrefs.widths[key] ?? LIST_COL_DEFAULT_WIDTH,
                      }}
                    />
                  ))}
                  {showRowActions ? (
                    <col style={{ width: LIST_TABLE_ACTIONS_COL_WIDTH }} />
                  ) : null}
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left">
                    <th className="w-11 px-4 py-3">
                      <input
                        aria-label="Seleccionar todas las filas visibles"
                        checked={allVisibleSelected}
                        className="size-4 accent-primary"
                        type="checkbox"
                        onChange={(e) => toggleAllVisible(e.target.checked)}
                      />
                    </th>
                    {visibleColumnEntries.map(({ col, key, header }) => (
                      <ResizableTableHeadCell
                        key={key}
                        label={header}
                        width={columnPrefs.widths[key] ?? LIST_COL_DEFAULT_WIDTH}
                        className={col.className}
                        sortable={isColumnSortable(col)}
                        sortDirection={sort?.key === key ? sort.direction : null}
                        onSort={
                          isColumnSortable(col) ? () => toggleSort(key) : undefined
                        }
                        onResize={(width) => setColumnWidth(key, width)}
                      />
                    ))}
                    {showRowActions ? (
                      <th className="w-[104px] px-4 py-3 text-center font-semibold text-foreground">
                        Acciones
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {useServerMode && serverQuery.loading ? (
                    <tr>
                      <td
                        className="px-4 py-12 text-center text-sm text-muted-foreground"
                        colSpan={colSpan}
                      >
                        Cargando registros…
                      </td>
                    </tr>
                  ) : useServerMode && serverQuery.connectionError ? (
                    <tr>
                      <td
                        className="px-4 py-12 text-center text-sm text-muted-foreground"
                        colSpan={colSpan}
                      >
                        No se pudo conectar con el servidor. Intente nuevamente en unos
                        minutos.
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-12 text-center text-sm text-muted-foreground"
                        colSpan={colSpan}
                      >
                        {query
                          ? `No hay resultados para «${query}» en esta página.`
                          : 'No hay registros para mostrar.'}
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr
                        key={row.id}
                        className={cn(
                          'border-b border-border last:border-b-0 hover:bg-muted/20',
                          getDetailPath &&
                            'group cursor-pointer transition-colors hover:bg-muted/30',
                        )}
                        onClick={() => getDetailPath && openDetail(row)}
                      >
                        <td
                          className="align-middle px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            aria-label={`Seleccionar ${primaryTitle(row)}`}
                            checked={selected.has(row.id)}
                            className="size-4 accent-primary"
                            type="checkbox"
                            onChange={(e) =>
                              toggleOne(row.id, e.target.checked)
                            }
                          />
                        </td>
                        {visibleColumnEntries.map(({ col, key }) => (
                          <td
                            key={`${row.id}-${key}`}
                            className={cn(
                              'overflow-hidden px-4 py-3',
                              col.kind === 'text' && col.mono && 'overflow-hidden',
                            )}
                            style={{
                              width: columnPrefs.widths[key] ?? LIST_COL_DEFAULT_WIDTH,
                              minWidth: columnPrefs.widths[key] ?? LIST_COL_DEFAULT_WIDTH,
                              maxWidth: columnPrefs.widths[key] ?? LIST_COL_DEFAULT_WIDTH,
                            }}
                          >
                            <CellContent
                              row={row}
                              col={col}
                              navigable={Boolean(getDetailPath)}
                            />
                          </td>
                        ))}
                        {showRowActions ? (
                          <td
                            className="px-4 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <RowActions
                              rowLabel={primaryTitle(row)}
                              variant={rowActions}
                              onEdit={onEditRow ? () => onEditRow(row) : undefined}
                              onArchive={
                                onArchiveRow ? () => onArchiveRow(row) : undefined
                              }
                              onLogOutreach={
                                onLogOutreachRow ? () => onLogOutreachRow(row) : undefined
                              }
                              emailHref={
                                rowActions === 'contact'
                                  ? getEmailHref(
                                      (row as unknown as ContactListItem).email,
                                    )
                                  : null
                              }
                              callHref={
                                rowActions === 'contact'
                                  ? getTelHref(
                                      contactDisplayPhone(
                                        row as unknown as ContactListItem,
                                      ),
                                    )
                                  : null
                              }
                            />
                          </td>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando{' '}
              <span className="font-medium text-foreground">{rangeStart}</span> a{' '}
              <span className="font-medium text-foreground">{rangeEnd}</span> de{' '}
              <span className="font-medium text-foreground">{effectiveTotal}</span>{' '}
              {entityPlural}
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 border-border"
                  aria-label="Página anterior"
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft aria-hidden className="size-4" />
                </Button>
                {pages.map((pNum) => (
                  <Button
                    key={pNum}
                    variant={pNum === page ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'min-w-9 border-border px-3',
                      pNum === page && 'pointer-events-none',
                    )}
                    type="button"
                    onClick={() => setPage(pNum)}
                  >
                    {pNum}
                  </Button>
                ))}
                {pages.length > 0 && pages[pages.length - 1]! < pageCount ? (
                  <span className="px-2 text-muted-foreground">…</span>
                ) : null}
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 border-border"
                  aria-label="Página siguiente"
                  type="button"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  <ChevronRight aria-hidden className="size-4" />
                </Button>
              </div>
              <select
                aria-label={`${entityPlural} por página`}
                value={pageSize}
                className={cn(
                  'h-9 rounded-md border border-border bg-background px-3 text-sm shadow-sm outline-none',
                  'focus-visible:ring-2 focus-visible:ring-ring',
                )}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} por página
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
        </div>
      )

  if (!embedded) {
    return <ListPageLayout header={moduleListHeader}>{moduleListBody}</ListPageLayout>
  }

  return (
    <>
      <div className={rootClassName}>{moduleListBody}</div>
      {embedded && toolbarHost && embeddedToolbar
        ? createPortal(embeddedToolbar, toolbarHost)
        : null}
    </>
  )
}

function CellContent<T extends ListRowBase>({
  row,
  col,
  navigable,
}: {
  row: T
  col: ModuleListConfig<T>['columns'][number]
  navigable?: boolean
}) {
  switch (col.kind) {
    case 'primary': {
      const name = col.title(row)
      const initials = col.initials?.(row) ?? defaultInitials(name)
      const avatarUrl = col.avatarUrl?.(row)
      const resolveUserId = col.avatarResolveUserId?.(row)
      const showAvatar = col.avatarUrl !== undefined
      return (
        <div className="flex items-center gap-3">
          {showAvatar ? (
            resolveUserId ? (
              <ListPrimaryUserAvatar
                userId={resolveUserId}
                name={name}
                initials={initials}
                avatarUrl={avatarUrl}
              />
            ) : (
              <Avatar className="size-10 shrink-0 border border-border">
                {avatarUrl ? <EntityAvatarImage src={avatarUrl} alt={name} /> : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            )
          ) : null}
          <div className="min-w-0">
            <p
              className={cn(
                'truncate font-semibold text-foreground',
                navigable && 'group-hover:text-primary',
              )}
            >
              {name}
            </p>
            {col.subtitle?.(row) ? (
              <p className="truncate text-xs text-muted-foreground">
                {col.subtitle(row)}
              </p>
            ) : null}
          </div>
        </div>
      )
    }
    case 'text':
      return (
        <span
          className={cn(
            'block text-muted-foreground',
            col.mono && 'truncate font-mono text-[13px] text-foreground',
            !col.mono && col.truncate !== false && 'line-clamp-2',
          )}
        >
          {col.cell(row)}
        </span>
      )
    case 'badge':
      return <Badge variant={col.variant(row)}>{col.label(row)}</Badge>
    case 'custom':
      return <>{col.render(row)}</>
  }
}

function RowActions({
  rowLabel,
  variant,
  onEdit,
  onArchive,
  onLogOutreach,
  emailHref,
  callHref,
}: {
  rowLabel: string
  variant: 'contact' | 'default'
  onEdit?: () => void
  onArchive?: () => void
  onLogOutreach?: () => void
  emailHref?: string | null
  callHref?: string | null
}) {
  const hasMenuActions = Boolean(onEdit || onArchive)
  return (
    <div className="flex items-center justify-center gap-1">
      {variant === 'contact' ? (
        <>
          {onLogOutreach ? (
            <Button
              size="icon"
              variant="ghost"
              className="size-9 text-muted-foreground"
              type="button"
              aria-label={`Registrar intento con ${rowLabel}`}
              title="Registrar intento de contacto"
              onClick={(e) => {
                e.stopPropagation()
                onLogOutreach()
              }}
            >
              <ClipboardCheck aria-hidden className="size-4" />
            </Button>
          ) : null}
          {callHref ? (
            <Button
              size="icon"
              variant="ghost"
              className="size-9 text-muted-foreground"
              asChild
            >
              <a
                href={callHref}
                aria-label={`Llamar a ${rowLabel}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Phone aria-hidden className="size-4" />
              </a>
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Sin teléfono para ${rowLabel}`}
              className="size-9 text-muted-foreground"
              type="button"
              disabled
            >
              <Phone aria-hidden className="size-4" />
            </Button>
          )}
          {emailHref ? (
            <Button
              size="icon"
              variant="ghost"
              className="size-9 text-muted-foreground"
              asChild
            >
              <a
                href={emailHref}
                aria-label={`Enviar email a ${rowLabel}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Mail aria-hidden className="size-4" />
              </a>
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Sin email para ${rowLabel}`}
              className="size-9 text-muted-foreground"
              type="button"
              disabled
            >
              <Mail aria-hidden className="size-4" />
            </Button>
          )}
        </>
      ) : null}
      {hasMenuActions ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Más acciones"
              className="size-9 text-muted-foreground"
              type="button"
            >
              <MoreHorizontal aria-hidden className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit ? (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
              >
                Editar
              </DropdownMenuItem>
            ) : null}
            {onEdit && onArchive ? <DropdownMenuSeparator /> : null}
            {onArchive ? (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onArchive()
                }}
              >
                Archivar
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}
