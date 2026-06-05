import { getContactApi } from '@/api/contacts'
import { contactDisplayPhone } from '@/lib/contact-lookup'
import { getCompanyApi } from '@/api/companies'
import { getOpportunityApi } from '@/api/opportunities'
import { getProductApi } from '@/api/products'
import { getQuoteApi, listQuotesForOpportunityApi } from '@/api/quotes'
import { normalizeQuoteDetailFromApi } from '@/lib/quote-detail-normalize'
import { getInvoiceApi } from '@/api/invoices'
import { getProjectApi } from '@/api/projects'
import { getActivityApi } from '@/api/activities'
import { getUserApi } from '@/api/users'
import { getPurchaseApi } from '@/api/purchases'
import { getInventoryApi } from '@/api/inventory'
import { enrichInventoryDetailIfNeeded } from '@/lib/inventory-product-enrich'
import { getStockReceiptApi } from '@/api/stock-receipts'
import { getAllKnownCompanies } from '@/data/companies-registry-store'
import { getAllKnownOpportunities } from '@/data/opportunities-registry-store'
import { getRegistryActivities } from '@/data/activities-registry-store'
import type { CompanyDetail } from '@/data/company-detail.mock'
import type { ContactDetail } from '@/data/contact-detail.mock'
import type { ContactListItem } from '@/data/contacts.mock'
import type { OpportunityDetail } from '@/data/opportunity-detail.mock'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import { buildDetailFromList } from '@/data/product-detail.mock'
import type { QuoteDetail } from '@/data/quote-detail.mock'
import type { InvoiceDetail } from '@/data/invoice-detail.mock'
import type { ProjectDetail } from '@/data/project-detail.mock'
import type { ActivityDetail } from '@/data/activity-detail.mock'
import type { PurchaseDetail } from '@/data/purchase-detail.mock'
import { getCompanyLocationsApi } from '@/api/companies'
import { isApiEnabled } from '@/api/config'
import { normalizePurchaseDetailFromApi } from '@/lib/purchase-detail-normalize'
import { mergePurchaseLinesWithIngresos } from '@/lib/purchase-lines'
import {
  loadPurchaseDetailOverride,
  mergeDetailOverride,
} from '@/lib/purchase-detail-storage'
import type { InventoryDetail } from '@/data/inventory-detail.mock'
import type { StockReceiptDetail } from '@/data/stock-receipt-detail.mock'
import type { UserDetail } from '@/data/user-detail.mock'
import { activitiesForContact } from '@/lib/contact-activities'
import { opportunitiesForContact } from '@/lib/contact-opportunities'
import { buildHeadquarters } from '@/data/company-locations.mock'
import {
  loadCompanyDetailOverride,
  mergeCompanyDetailOverride,
} from '@/lib/company-detail-storage'
import { findCompanyById } from '@/lib/company-lookup'
import { formatContactLocation } from '@/lib/contact-create'
import { mergeOutreachIntoContact } from '@/lib/contact-outreach-storage'
import { mergeContactListAvatar } from '@/lib/entity-list-image-cache'
import { mergeEntityNotes } from '@/lib/entity-notes-storage'
import { buildJourneyHistory } from '@/lib/project-journey'
import { enrichProjectCommercialLinks } from '@/lib/project-relations'
import { computeInvoiceTotals } from '@/lib/invoice-line-item'
import { formatAmount } from '@/lib/invoice-display'
import {
  quoteSummariesForOpportunity,
  quoteSummariesFromListItems,
  type OpportunityQuoteSummary,
} from '@/lib/quote-relations'
import { defaultDurationMinutesForType } from '@/lib/activity-create'
import { normalizeActivityDetail } from '@/lib/activity-detail-normalize'
import { mergeEntityFiles } from '@/lib/entity-files-storage'
import { getCompanyFiles } from '@/lib/company-files'
import { getContactFiles } from '@/lib/contact-files'
import { getInventoryFiles } from '@/lib/inventory-files'
import { getInvoiceFiles } from '@/lib/invoice-files'
import { getPurchaseFiles } from '@/lib/purchase-files'
import { getQuoteFiles } from '@/lib/quote-files'
import { getOpportunityFiles } from '@/lib/opportunity-files'
import { getProjectFiles } from '@/lib/project-files'
import type { ContactActivityType } from '@/data/contact-detail.mock'
import { loadCatalogSettings } from '@/lib/catalog-settings'
import {
  defaultWarehouseFromCatalog,
  resolveWarehouseFromStoredLabel,
  warehouseFormPatchFromSelection,
} from '@/lib/warehouse-lookup'

import { normalizeContactStatus } from '@/lib/contact-form'

function statusScore(status: ContactListItem['status']): number {
  switch (normalizeContactStatus(status)) {
    case 'Cliente':
      return 88
    case 'Prospecto':
      return 72
    case 'Proveedor':
      return 65
    default:
      return 72
  }
}

export function buildContactDetailFromListItem(raw: ContactListItem): ContactDetail {
  const base = mergeContactListAvatar(mergeOutreachIntoContact(raw))
  const linkedCompany = base.companyId
    ? findCompanyById(getAllKnownCompanies(), base.companyId)
    : undefined
  const ownerName = base.ownerName?.trim() || '—'
  const owner = { name: ownerName }
  const storedLocation = formatContactLocation(base)
  const activities = activitiesForContact(getRegistryActivities(), base)
  const opportunities = opportunitiesForContact(getAllKnownOpportunities(), {
    id: base.id,
    name: base.name,
    company: base.company,
    companyId: base.companyId,
  })

  const seedNotes = base.initialNote
    ? [
        {
          id: `note-${base.id}-0`,
          body: base.initialNote,
          author: ownerName,
          when: 'Al crear registro',
        },
      ]
    : []

  return {
    ...base,
    location: storedLocation ?? '',
    timezone: '',
    linkedIn: base.linkedIn ?? '',
    source: base.source ?? '',
    owner,
    companyDetail: {
      name: linkedCompany?.name ?? base.company,
      industry: linkedCompany?.industry ?? '',
      website: '',
      employees: linkedCompany?.employees ?? '',
    },
    score: statusScore(base.status),
    pipelineValue: '$0',
    status: normalizeContactStatus(base.status),
    pendingActivities: activities.filter(
      (a) => a.status === 'Pendiente' || a.status === 'En curso',
    ).length,
    tags: [],
    activities,
    notes: seedNotes,
    opportunities: opportunities.map((opp) => ({
      id: opp.id,
      name: opp.name,
      stage: opp.stage,
      amount: opp.amount,
      closeDate: opp.closeDate,
      probability: opp.probability,
    })),
    files: [],
  }
}

export async function loadContactDetail(id: string): Promise<ContactDetail> {
  const api = await getContactApi(id)
  const detail = buildContactDetailFromListItem({ ...api, id: api.id })
  detail.notes = await mergeEntityNotes('contacto', id, detail.notes)
  detail.files = await mergeEntityFiles(
    'contacto',
    id,
    getContactFiles(id, detail.owner.name),
  )
  return detail
}

export async function loadCompanyDetail(id: string): Promise<CompanyDetail> {
  const api = await getCompanyApi(id)
  const ownerName = api.owner?.trim() || '—'
  let branches: CompanyDetail['branches'] = []
  let addresses: CompanyDetail['addresses'] = []
  let headquarters: CompanyDetail['headquarters'] | undefined
  if (isApiEnabled()) {
    try {
      const locations = await getCompanyLocationsApi(id)
      branches = locations.branches
      addresses = locations.addresses
      headquarters = locations.headquarters ?? undefined
    } catch {
      branches = []
      addresses = []
      headquarters = undefined
    }
  }

  const built: CompanyDetail = {
    ...api,
    id: api.id,
    headquarters: headquarters
      ? {
          ...headquarters,
          isHeadquarters: true,
          street: headquarters.street || api.headquartersStreet || '',
          city: headquarters.city || api.city || '',
        }
      : buildHeadquarters(api.id, api.name, api.city, api.headquartersStreet),
    branches,
    addresses,
    website: '',
    phone: '',
    email: '',
    description: '',
    ownerDetail: { name: ownerName },
    pipelineValue: '$0',
    contactCount: 0,
    pendingActivities: 0,
    tags: [],
    activities: [],
    notes: [],
    opportunities: [],
    files: [],
    linkedContacts: [],
  }

  const merged = mergeCompanyDetailOverride(built, loadCompanyDetailOverride(id))
  merged.notes = await mergeEntityNotes('empresa', id, merged.notes ?? [])
  merged.files = await mergeEntityFiles(
    'empresa',
    id,
    getCompanyFiles(id, ownerName),
  )
  return merged
}

export async function loadQuotesForOpportunity(
  opportunityId: string,
): Promise<OpportunityQuoteSummary[]> {
  if (isApiEnabled()) {
    const items = await listQuotesForOpportunityApi(opportunityId)
    return quoteSummariesFromListItems(items)
  }
  return quoteSummariesForOpportunity(opportunityId)
}

/** Campos de detalle que el API no envía; valores por defecto para la UI. */
export function normalizeOpportunityDetail(
  api: OpportunityListItem & Partial<OpportunityDetail>,
  linkedQuotes?: OpportunityQuoteSummary[],
): OpportunityDetail {
  const quotes =
    linkedQuotes ??
    api.quotes ??
    (isApiEnabled() ? [] : quoteSummariesForOpportunity(api.id))
  const lineItems = api.lineItems ?? []

  return {
    ...api,
    description: api.description ?? '',
    stageEnteredAt: api.stageEnteredAt ?? '',
    contactEmail: api.contactEmail ?? '',
    contactPhone: api.contactPhone ?? '',
    decisionMaker: api.decisionMaker ?? api.contactName ?? '',
    competitors: api.competitors ?? '',
    budget: api.budget ?? api.amount ?? '',
    buyingProcess: api.buyingProcess ?? '',
    tags: api.tags ?? [],
    lineItems,
    activities: api.activities ?? [],
    notes: api.notes ?? [],
    files: api.files ?? [],
    quotes,
    stageHistory: api.stageHistory ?? [],
    pendingActivities: api.pendingActivities ?? 0,
    quoteCount: quotes.length,
    daysInStage: api.daysInStage ?? 0,
    primaryQuoteId:
      (api as { primaryQuoteId?: string }).primaryQuoteId ?? undefined,
  }
}

export async function loadOpportunityDetail(id: string): Promise<OpportunityDetail> {
  const [api, linkedQuotes] = await Promise.all([
    getOpportunityApi(id),
    loadQuotesForOpportunity(id),
  ])
  let detail = normalizeOpportunityDetail(api, linkedQuotes)

  if (
    detail.contactId?.trim() &&
    (!detail.contactEmail?.trim() || !detail.contactPhone?.trim())
  ) {
    try {
      const contact = await getContactApi(detail.contactId.trim())
      detail = {
        ...detail,
        contactEmail: detail.contactEmail?.trim() || contact.email?.trim() || '',
        contactPhone:
          detail.contactPhone?.trim() || contactDisplayPhone(contact) || '',
      }
    } catch {
      /* contacto opcional */
    }
  }

  detail.notes = await mergeEntityNotes('oportunidad', id, detail.notes ?? [])
  detail.files = await mergeEntityFiles(
    'oportunidad',
    id,
    getOpportunityFiles(id, detail.owner),
  )
  return detail
}

export async function loadProductDetail(id: string) {
  const api = await getProductApi(id)
  const detail = buildDetailFromList({ ...api }, id)
  detail.notes = await mergeEntityNotes('producto', id, detail.notes ?? [])
  return detail
}

export async function loadUserDetail(id: string): Promise<UserDetail> {
  const api = await getUserApi(id)
  return {
    ...api,
    id: api.id,
    profileId: api.profileId,
    phone: api.phone ?? '',
    department: api.department ?? '',
    jobTitle: api.jobTitle ?? '',
    bio: api.bio ?? '',
    teams: api.teams ?? [],
    permissions: api.permissions ?? [],
    recentSessions: api.recentSessions ?? [],
    notes: await mergeEntityNotes('usuario', id, api.notes ?? []),
  } as UserDetail
}

export async function loadPurchaseDetail(id: string): Promise<PurchaseDetail> {
  const api = await getPurchaseApi(id)
  const catalog = loadCatalogSettings()
  const resolvedWh =
    (api.warehouseId
      ? catalog.warehouses.find((w) => w.id === api.warehouseId)
      : undefined) ??
    resolveWarehouseFromStoredLabel(catalog.warehouses, api.warehouse) ??
    defaultWarehouseFromCatalog(catalog.warehouses)
  const whPatch = warehouseFormPatchFromSelection(resolvedWh)

  const normalized = normalizePurchaseDetailFromApi({
    ...api,
    warehouseId: api.warehouseId ?? (whPatch.warehouseId || undefined),
    warehouse: api.warehouse ?? whPatch.warehouse ?? '',
    deliveryAddress: api.deliveryAddress ?? whPatch.deliveryAddress ?? '',
    supplierContact: api.supplierContact ?? '',
    supplierEmail: api.supplierEmail ?? '',
    supplierPhone: api.supplierPhone ?? '',
  })

  mergePurchaseLinesWithIngresos({ [id]: normalized.lineItems })

  const override = isApiEnabled() ? null : loadPurchaseDetailOverride(id)
  const detail = mergeDetailOverride(normalized, override)
  detail.notes = await mergeEntityNotes('compra', id, detail.notes ?? [])
  detail.files = await mergeEntityFiles(
    'compra',
    id,
    getPurchaseFiles(id, detail.owner),
  )
  return detail
}

export async function loadStockReceiptDetail(id: string): Promise<StockReceiptDetail> {
  const api = await getStockReceiptApi(id)
  return {
    ...api,
    id: api.id,
    lineItems: api.lineItems ?? [],
    notes: await mergeEntityNotes('recepcion', id, api.notes ?? []),
    activities: api.activities ?? [],
  } as StockReceiptDetail
}

export async function loadInventoryDetail(id: string): Promise<InventoryDetail> {
  const api = enrichInventoryDetailIfNeeded(await getInventoryApi(id))
  const recordEntityId = api.recordEntityId ?? api.id
  const routeId = api.isProductView ? id : api.id
  return {
    ...api,
    id: routeId,
    recordEntityId,
    owner: api.owner ?? '—',
    category: api.category ?? '',
    unitCost: api.unitCost ?? '',
    warehouseZone: api.warehouseZone ?? '',
    tags: api.tags ?? [],
    movements: api.movements ?? [],
    activities: api.activities ?? [],
    notes: await mergeEntityNotes('inventario', recordEntityId, api.notes ?? []),
    files: await mergeEntityFiles(
      'inventario',
      recordEntityId,
      getInventoryFiles(recordEntityId, api.owner ?? '—'),
    ),
  } as InventoryDetail
}

export async function loadQuoteDetail(id: string): Promise<QuoteDetail> {
  const api = await getQuoteApi(id)
  let contactEmail = ''
  if (api.contactId?.trim()) {
    try {
      const contact = await getContactApi(api.contactId.trim())
      contactEmail = contact.email?.trim() ?? ''
    } catch {
      /* contacto opcional para vista */
    }
  }
  const quote = normalizeQuoteDetailFromApi(
    {
      ...api,
      lineItems: api.lineItems ?? [],
      contactName: (api as { contactName?: string }).contactName,
    },
    { contactEmail },
  )
  quote.notes = await mergeEntityNotes('cotizacion', id, quote.notes ?? [])
  quote.files = await mergeEntityFiles(
    'cotizacion',
    id,
    getQuoteFiles(id, quote.owner),
  )
  return quote
}

export async function loadInvoiceDetail(id: string): Promise<InvoiceDetail> {
  const api = await getInvoiceApi(id)
  const lineItems = api.lineItems ?? []
  const totals = computeInvoiceTotals(lineItems)
  const paidAmountNum = api.payments?.length
    ? api.payments
        .filter((p) => p.status === 'Confirmado')
        .reduce(
          (sum, p) => sum + Number.parseInt(p.amount.replace(/[^\d]/g, ''), 10) || 0,
          0,
        )
    : 0

  return {
    ...api,
    id: api.id,
    lineItems,
    payments: api.payments ?? [],
    subtotal: totals.subtotal,
    taxableSubtotal: totals.taxableSubtotal,
    exemptSubtotal: totals.exemptSubtotal,
    taxPercent: totals.taxPercent,
    taxAmount: totals.taxAmount,
    paidAmountNum,
    balanceDue:
      api.status === 'Pagada'
        ? '$0'
        : formatAmount(Math.max(0, totals.amountNum - paidAmountNum)),
    activities: [],
    notes: await mergeEntityNotes('factura', id, api.notes ?? []),
    files: await mergeEntityFiles(
      'factura',
      id,
      getInvoiceFiles(id, api.owner ?? '—'),
    ),
    statusHistory: [],
    internalNotes: '',
    description: api.description ?? '',
  } as InvoiceDetail
}

export async function loadProjectDetail(id: string): Promise<ProjectDetail> {
  const api = await getProjectApi(id)
  const journeyStage = api.journeyStage
  const project = enrichProjectCommercialLinks({
    ...api,
    id: api.id,
    team: api.team ?? [],
    activities: [],
    notes: await mergeEntityNotes('proyecto', id, []),
    journeyHistory: buildJourneyHistory(journeyStage, [
      {
        id: `${id}-jh-start`,
        stage: 'Nuevo',
        enteredAt: api.startDate?.trim() && api.startDate !== '—' ? api.startDate : '—',
      },
    ]),
    tags: [],
    hoursLogged: Number(api.hoursLogged) || 0,
    hoursEstimated: Number(api.hoursEstimated) || 0,
    description: api.description?.trim() ?? '',
    files: [],
  }) as ProjectDetail
  project.files = await mergeEntityFiles(
    'proyecto',
    id,
    getProjectFiles(id, project.manager),
  )
  return project
}

export async function loadActivityDetail(id: string): Promise<ActivityDetail> {
  const api = await getActivityApi(id)
  return normalizeActivityDetail({
    ...api,
    id: api.id,
    statusHistory: [],
    notes: await mergeEntityNotes('actividad', id, api.notes ?? []),
    description: api.description ?? '',
    durationMinutes:
      api.durationMinutes ?? defaultDurationMinutesForType(api.type as ContactActivityType),
    location: api.location ?? '',
    outcome: api.outcome ?? '',
    tags: api.tags ?? [],
    completedAt: api.completedAt,
  })
}
