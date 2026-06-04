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
import type { ReportDataSourceId } from '../types/report-table.js'

const MAX_ROWS = 5000

type ReportTableRow = Record<string, string>

function str(value: unknown): string {
  if (value == null) return ''
  return String(value)
}

function mapContact(row: Record<string, unknown>): ReportTableRow {
  return {
    id: str(row.id),
    name: str(row.name),
    email: str(row.email),
    phone: str(row.phone),
    company: str(row.company),
    companyId: str(row.companyId),
    status: str(row.status),
    ownerName: str(row.ownerName),
    lastContact: str(row.lastContact),
    createdAt: str(row.createdAt),
    updatedAt: str(row.updatedAt),
    createdByName: str(row.createdByName),
    updatedByName: str(row.updatedByName),
  }
}

function mapCompany(row: Record<string, unknown>): ReportTableRow {
  return {
    id: str(row.id),
    name: str(row.name),
    industry: str(row.industry),
    city: str(row.city),
    owner: str(row.owner),
    lifecycle: str(row.lifecycle),
    operationalStatus: str(row.operationalStatus),
    lastActivity: str(row.lastActivity),
    createdAt: str(row.createdAt),
    updatedAt: str(row.updatedAt),
  }
}

async function loadRows(sourceId: ReportDataSourceId): Promise<ReportTableRow[]> {
  const pageSize = MAX_ROWS
  switch (sourceId) {
    case 'contactos': {
      const { items } = await contactsRepo.listContacts({
        page: 1,
        pageSize,
        archivedOnly: false,
      })
      return items.map((r) => mapContact(r as unknown as Record<string, unknown>))
    }
    case 'empresas': {
      const { items } = await companiesRepo.listCompanies({
        page: 1,
        pageSize,
        archivedOnly: false,
      })
      return items.map((r) => mapCompany(r as unknown as Record<string, unknown>))
    }
    case 'oportunidades': {
      const { items } = await opportunitiesRepo.listOpportunities({
        page: 1,
        pageSize,
        archivedOnly: false,
      })
      return items.map((r) => {
        const row = r as unknown as Record<string, unknown>
        return {
          id: str(row.id),
          name: str(row.name),
          company: str(row.company),
          companyId: str(row.companyId),
          stage: str(row.stage),
          amount: str(row.amount),
          probability: str(row.probability),
          closeDate: str(row.closeDate),
          owner: str(row.owner),
        }
      })
    }
    case 'actividades': {
      const { items } = await activitiesRepo.listActivities({
        page: 1,
        pageSize,
        archivedOnly: false,
      })
      return items.map((r) => {
        const row = r as unknown as Record<string, unknown>
        return {
          id: str(row.id),
          title: str(row.title),
          type: str(row.type),
          status: str(row.status),
          when: str(row.when),
          assignee: str(row.assignee),
          relatedName: str(row.relatedName),
        }
      })
    }
    case 'productos': {
      const { items } = await productsRepo.listProducts({ page: 1, pageSize })
      return items.map((r) => {
        const row = r as unknown as Record<string, unknown>
        return {
          id: str(row.id),
          name: str(row.name),
          sku: str(row.sku),
          category: str(row.category),
          price: str(row.price),
          status: str(row.status),
        }
      })
    }
    case 'facturas': {
      const { items } = await invoicesRepo.listInvoices({
        page: 1,
        pageSize,
        archivedOnly: false,
      })
      return items.map((r) => {
        const row = r as unknown as Record<string, unknown>
        return {
          id: str(row.id),
          number: str(row.number),
          clientName: str(row.clientName),
          amount: str(row.amount),
          status: str(row.status),
          issueDate: str(row.issueDate),
          dueDate: str(row.dueDate),
          quoteId: str(row.quoteId),
        }
      })
    }
    case 'proyectos': {
      const { items } = await projectsRepo.listProjects({
        page: 1,
        pageSize,
        archivedOnly: false,
      })
      return items.map((r) => {
        const row = r as unknown as Record<string, unknown>
        return {
          id: str(row.id),
          name: str(row.name),
          client: str(row.client),
          status: str(row.status),
          progress: str(row.progress),
          deadline: str(row.deadline),
        }
      })
    }
    case 'cotizaciones': {
      const { items } = await quotesRepo.listQuotes({
        page: 1,
        pageSize,
        archivedOnly: false,
      })
      return items.map((r) => {
        const row = r as unknown as Record<string, unknown>
        return {
          id: str(row.id),
          code: str(row.code),
          title: str(row.title),
          companyName: str(row.companyName),
          amount: str(row.amount),
          status: str(row.status),
          opportunityId: str(row.opportunityId),
        }
      })
    }
    case 'compras': {
      const { items } = await purchasesRepo.listPurchases({
        page: 1,
        pageSize,
        archivedOnly: false,
      })
      return items.map((r) => {
        const row = r as unknown as Record<string, unknown>
        return {
          id: str(row.id),
          reference: str(row.reference),
          supplier: str(row.supplier),
          supplierId: str(row.supplierId),
          amount: str(row.amount),
          status: str(row.status),
          orderDate: str(row.orderDate),
        }
      })
    }
    case 'ingresos': {
      const { items } = await stockReceiptsRepo.listStockReceipts({
        page: 1,
        pageSize,
        archivedOnly: false,
      })
      return items.map((r) => {
        const row = r as unknown as Record<string, unknown>
        return {
          id: str(row.id),
          number: str(row.number),
          status: str(row.status),
          purchaseId: str(row.purchaseId),
          productSummary: str(row.productSummary),
          confirmedAt: str(row.confirmedAt),
        }
      })
    }
    case 'inventario': {
      const { items } = await inventoryRepo.listInventory({ page: 1, pageSize })
      return items.map((r) => {
        const row = r as unknown as Record<string, unknown>
        return {
          id: str(row.id),
          productName: str(row.productName),
          sku: str(row.sku),
          location: str(row.location),
          quantity: str(row.quantity),
          status: str(row.status),
        }
      })
    }
    default:
      return []
  }
}

const FIELD_LABELS: Record<string, string> = {
  id: 'ID',
  name: 'Nombre',
  email: 'Email',
  phone: 'Teléfono',
  company: 'Empresa',
  status: 'Estado',
  amount: 'Monto',
  reference: 'Referencia',
  number: 'Número',
}

export async function executeReportTable(
  config: ReportTableConfig,
): Promise<ReportTableRunResult & { filterError?: string }> {
  const allRows = await loadRows(config.dataSource)
  const { rows: filtered, error } = filterReportRows(
    allRows,
    config.conditions ?? [],
    config.combineMode ?? 'all-and',
    config.customExpression ?? '',
  )

  const columnIds =
    config.columnIds?.length > 0
      ? config.columnIds
      : Object.keys(allRows[0] ?? {}).slice(0, 8)

  const columns = columnIds.map((id) => ({
    id,
    label: FIELD_LABELS[id] ?? id,
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
