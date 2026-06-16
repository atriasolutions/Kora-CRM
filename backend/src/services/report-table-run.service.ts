import type { ReportTableConfig, ReportTableRunResult } from '../types/report-table.js'
import * as contactsRepo from '../repositories/contacts.repository.js'
import * as companiesRepo from '../repositories/companies.repository.js'
import * as opportunitiesRepo from '../repositories/opportunities.repository.js'
import * as activitiesRepo from '../repositories/activities.repository.js'
import * as productsRepo from '../repositories/products.repository.js'
import * as invoicesRepo from '../repositories/invoices.repository.js'
import * as projectsRepo from '../repositories/projects.repository.js'
import * as quotesRepo from '../repositories/quotes.repository.js'
import * as purchasesRepo from '../repositories/purchases.repository.js'
import * as stockReceiptsRepo from '../repositories/stock-receipts.repository.js'
import * as inventoryRepo from '../repositories/inventory.repository.js'
import { filterReportRows } from '../lib/report-filter-engine.js'
import { reportFieldLabel } from '../lib/report-field-labels.js'
import type { ReportDataSourceId } from '../types/report-table.js'

const MAX_ROWS = 5000

type ReportTableRow = Record<string, string>

const SKIP_REPORT_KEYS = new Set([
  'avatarUrl',
  'logoUrl',
  'imageUrl',
  'createdById',
  'updatedById',
  'teamMembers',
])

function toIsoDate(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  return ''
}

function listItemToReportRow(item: object): ReportTableRow {
  const out: ReportTableRow = {}
  for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
    if (SKIP_REPORT_KEYS.has(key)) continue
    if (value == null) {
      out[key] = ''
      continue
    }
    if (typeof value === 'object') continue
    out[key] = String(value)
  }

  if (out.createdAt) {
    out.createdAtDate = toIsoDate(out.createdAt)
  }
  if (out.updatedAt) {
    out.updatedAtDate = toIsoDate(out.updatedAt)
  }

  return out
}

export async function loadReportRows(sourceId: ReportDataSourceId): Promise<ReportTableRow[]> {
  const pageSize = MAX_ROWS
  switch (sourceId) {
    case 'contactos': {
      const { items } = await contactsRepo.listContacts({
        page: 1,
        pageSize,
        archivedOnly: false,
      })
      return items.map((r) => listItemToReportRow(r))
    }
    case 'empresas': {
      const { items } = await companiesRepo.listCompanies({
        page: 1,
        pageSize,
        archivedOnly: false,
      })
      return items.map((r) => listItemToReportRow(r))
    }
    case 'oportunidades': {
      const { items } = await opportunitiesRepo.listOpportunities({
        page: 1,
        pageSize,
        archivedOnly: false,
      })
      return items.map((r) => listItemToReportRow(r))
    }
    case 'actividades': {
      const { items } = await activitiesRepo.listActivities({
        page: 1,
        pageSize,
        archivedOnly: false,
      })
      return items.map((r) => listItemToReportRow(r))
    }
    case 'productos': {
      const { items } = await productsRepo.listProducts({ page: 1, pageSize })
      return items.map((r) => listItemToReportRow(r))
    }
    case 'facturas': {
      const { items } = await invoicesRepo.listInvoices({
        page: 1,
        pageSize,
        archivedOnly: false,
      })
      return items.map((r) => listItemToReportRow(r))
    }
    case 'proyectos': {
      const { items } = await projectsRepo.listProjects({
        page: 1,
        pageSize,
        archivedOnly: false,
      })
      return items.map((r) => listItemToReportRow(r))
    }
    case 'cotizaciones': {
      const { items } = await quotesRepo.listQuotes({
        page: 1,
        pageSize,
        archivedOnly: false,
      })
      return items.map((r) => listItemToReportRow(r))
    }
    case 'compras': {
      const { items } = await purchasesRepo.listPurchases({
        page: 1,
        pageSize,
        archivedOnly: false,
      })
      return items.map((r) => listItemToReportRow(r))
    }
    case 'ingresos': {
      const { items } = await stockReceiptsRepo.listStockReceipts({
        page: 1,
        pageSize,
        archivedOnly: false,
      })
      return items.map((r) => listItemToReportRow(r))
    }
    case 'inventario': {
      const { items } = await inventoryRepo.listInventory({ page: 1, pageSize })
      return items.map((r) => listItemToReportRow(r))
    }
    default:
      return []
  }
}

export async function executeReportTable(
  config: ReportTableConfig,
): Promise<ReportTableRunResult & { filterError?: string }> {
  const allRows = await loadReportRows(config.dataSource)
  const { rows: filtered, error } = filterReportRows(
    allRows,
    config.conditions ?? [],
    config.combineMode ?? 'all-and',
    config.customExpression ?? '',
  )

  const columnIds =
    config.columnIds?.length > 0
      ? config.columnIds
      : Object.keys(allRows[0] ?? {}).slice(0, 10)

  const columns = columnIds.map((id) => ({
    id,
    label: reportFieldLabel(id),
    type: 'text' as const,
  }))

  const visibleRows = filtered.map((row) => {
    const out: ReportTableRow = {}
    for (const col of columns) {
      out[col.id] = row[col.id] ?? ''
    }
    return out
  })

  return {
    columns,
    rows: visibleRows,
    totalBeforeFilter: allRows.length,
    filterError: error,
  }
}
