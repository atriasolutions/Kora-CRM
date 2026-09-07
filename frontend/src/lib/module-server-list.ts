import { fetchListPage } from '@/api/list-page'
import { API_V1 } from '@/api/config'
import { resolveEntityImageSrc } from '@/lib/image-upload'
import type { ActivityListItem } from '@/data/activities.mock'
import type { BitacoraListItem } from '@/data/bitacora.mock'
import type { CompanyListItem } from '@/data/companies.mock'
import type { ContactListItem } from '@/data/contacts.mock'
import type { InventoryListItem } from '@/data/inventory.mock'
import type { InvoiceListItem } from '@/data/invoices.mock'
import type { BoletaListItem } from '@/data/boletas.mock'
import type { ExpenseListItem } from '@/data/expenses.mock'
import type { WorkerListItem } from '@/data/workers.mock'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import type { ProductListItem } from '@/data/products.mock'
import type { ProjectListItem } from '@/data/projects.mock'
import type { SolicitudListItem } from '@/data/solicitudes.mock'
import type { PruebaSolicitudListItem } from '@/data/pruebas-solicitud.mock'
import type { PurchaseListItem } from '@/data/purchases.mock'
import type { QuoteListItem } from '@/data/quotes.mock'
import type { StockReceiptListItem } from '@/data/stock-receipts.mock'
import type { UserListItem } from '@/data/users.mock'
import type {
  ServerListFetchParams,
  ServerListFetchResult,
} from '@/hooks/use-server-list-query'

async function fetchModulePage<T>(
  path: string,
  params: ServerListFetchParams,
  extra?: Record<string, string | undefined>,
): Promise<ServerListFetchResult<T>> {
  const result = await fetchListPage<T>(path, {
    page: params.page,
    pageSize: params.pageSize,
    q: params.query,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
    extra,
  })
  return { rows: result.items, total: result.total }
}

export function fetchContactsServerPage(
  params: ServerListFetchParams,
  archived = false,
  extraQuery: Record<string, string> = {},
): Promise<ServerListFetchResult<ContactListItem>> {
  return fetchModulePage(`${API_V1}/contacts`, params, {
    archived: archived ? 'true' : 'false',
    ...extraQuery,
  })
}

export function fetchCompaniesServerPage(
  params: ServerListFetchParams,
  archived = false,
  extraQuery: Record<string, string> = {},
): Promise<ServerListFetchResult<CompanyListItem>> {
  return fetchModulePage(`${API_V1}/companies`, params, {
    archived: archived ? 'true' : 'false',
    ...extraQuery,
  })
}

export function fetchOpportunitiesServerPage(
  params: ServerListFetchParams,
  archived = false,
  extraQuery: Record<string, string> = {},
): Promise<ServerListFetchResult<OpportunityListItem>> {
  return fetchModulePage(`${API_V1}/opportunities`, params, {
    archived: archived ? 'true' : 'false',
    ...extraQuery,
  })
}

export function fetchQuotesServerPage(
  params: ServerListFetchParams,
  archived = false,
  extraQuery: Record<string, string> = {},
): Promise<ServerListFetchResult<QuoteListItem>> {
  return fetchModulePage(`${API_V1}/quotes`, params, {
    archived: archived ? 'true' : 'false',
    ...extraQuery,
  })
}

export function fetchInvoicesServerPage(
  params: ServerListFetchParams,
  archived = false,
  extraQuery: Record<string, string> = {},
): Promise<ServerListFetchResult<InvoiceListItem>> {
  return fetchModulePage(`${API_V1}/invoices`, params, {
    archived: archived ? 'true' : 'false',
    ...extraQuery,
  })
}

export function fetchBoletasServerPage(
  params: ServerListFetchParams,
  archived = false,
  extraQuery: Record<string, string> = {},
): Promise<ServerListFetchResult<BoletaListItem>> {
  return fetchModulePage(`${API_V1}/boletas`, params, {
    archived: archived ? 'true' : 'false',
    ...extraQuery,
  })
}

export function fetchExpensesServerPage(
  params: ServerListFetchParams,
  archived = false,
  extraQuery: Record<string, string> = {},
): Promise<ServerListFetchResult<ExpenseListItem>> {
  return fetchModulePage(`${API_V1}/expenses`, params, {
    archived: archived ? 'true' : 'false',
    ...extraQuery,
  })
}

export function fetchWorkersServerPage(
  params: ServerListFetchParams,
  archived = false,
  extraQuery: Record<string, string> = {},
): Promise<ServerListFetchResult<WorkerListItem>> {
  return fetchModulePage(`${API_V1}/workers`, params, {
    archived: archived ? 'true' : 'false',
    ...extraQuery,
  })
}

export function fetchPurchasesServerPage(
  params: ServerListFetchParams,
  archived = false,
  extraQuery: Record<string, string> = {},
): Promise<ServerListFetchResult<PurchaseListItem>> {
  return fetchModulePage(`${API_V1}/purchases`, params, {
    archived: archived ? 'true' : 'false',
    ...extraQuery,
  })
}

export function fetchStockReceiptsServerPage(
  params: ServerListFetchParams,
  archived = false,
  extraQuery: Record<string, string> = {},
): Promise<ServerListFetchResult<StockReceiptListItem>> {
  return fetchModulePage(`${API_V1}/stock-receipts`, params, {
    archived: archived ? 'true' : 'false',
    ...extraQuery,
  })
}

export function fetchActivitiesServerPage(
  params: ServerListFetchParams,
  archived = false,
  extraQuery: Record<string, string> = {},
): Promise<ServerListFetchResult<ActivityListItem>> {
  return fetchModulePage(`${API_V1}/activities`, params, {
    archived: archived ? 'true' : 'false',
    ...extraQuery,
  })
}

export function fetchProductsServerPage(
  params: ServerListFetchParams,
  extraQuery: Record<string, string> = {},
): Promise<ServerListFetchResult<ProductListItem>> {
  return fetchModulePage(`${API_V1}/products`, params, extraQuery)
}

export function fetchProjectsServerPage(
  params: ServerListFetchParams,
  archived = false,
  extraQuery: Record<string, string> = {},
): Promise<ServerListFetchResult<ProjectListItem>> {
  return fetchModulePage(`${API_V1}/projects`, params, {
    archived: archived ? 'true' : 'false',
    ...extraQuery,
  })
}

export function fetchSolicitudesServerPage(
  params: ServerListFetchParams,
  archived = false,
  extraQuery: Record<string, string> = {},
): Promise<ServerListFetchResult<SolicitudListItem>> {
  return fetchModulePage(`${API_V1}/solicitudes`, params, {
    archived: archived ? 'true' : 'false',
    ...extraQuery,
  })
}

export function fetchPruebasSolicitudServerPage(
  params: ServerListFetchParams,
  archived = false,
  extraQuery: Record<string, string> = {},
): Promise<ServerListFetchResult<PruebaSolicitudListItem>> {
  return fetchModulePage(`${API_V1}/pruebas-solicitud`, params, {
    archived: archived ? 'true' : 'false',
    ...extraQuery,
  })
}

export function fetchBitacoraServerPage(
  params: ServerListFetchParams,
  archived = false,
  extraQuery: Record<string, string> = {},
): Promise<ServerListFetchResult<BitacoraListItem>> {
  return fetchModulePage(`${API_V1}/bitacora`, params, {
    archived: archived ? 'true' : 'false',
    ...extraQuery,
  })
}

export async function fetchUsersServerPage(
  params: ServerListFetchParams,
  extraQuery: Record<string, string> = {},
): Promise<ServerListFetchResult<UserListItem>> {
  const result = await fetchModulePage<UserListItem>(`${API_V1}/users`, params, extraQuery)
  return {
    rows: result.rows.map((row) => ({
      ...row,
      avatarUrl: resolveEntityImageSrc(row.avatarUrl),
    })),
    total: result.total,
  }
}

export function fetchInventoryServerPage(
  params: ServerListFetchParams,
): Promise<ServerListFetchResult<InventoryListItem>> {
  return fetchModulePage(`${API_V1}/inventory`, params)
}
