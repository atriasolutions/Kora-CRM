import type { ContactActivity, ContactNote } from '@/data/contact-detail.mock'
import type { QuoteFile } from '@/lib/quote-files'
import { getDefaultVatPercent, formatVatPercentLabel } from '@/lib/default-vat'
import { buildQuoteActivitiesForDetail } from '@/lib/quote-activities'
import { mergeEntityNotesForMock } from '@/lib/entity-notes-storage'
import { opportunityListSeed } from '@/data/opportunities.mock'
import type { QuoteListItem } from '@/data/quotes.mock'
import {
  isMainLineStage,
  isOffRouteStage,
  legacyStatusToQuoteJourney,
  resolveQuoteJourneyStage,
  type QuoteJourneyMainStage,
  type QuoteJourneyStage,
  type QuoteStatusHistoryEntry,
} from '@/lib/quote-journey'
import { getRegistryQuoteById } from '@/data/quotes-registry-store'
import { quoteListSeed } from '@/data/quotes.mock'
import { productForInventorySku } from '@/lib/inventory-relations'
import { loadCatalogSettings } from '@/lib/catalog-settings'
import { loadQuoteDetailOverride } from '@/lib/quote-detail-storage'
import {
  defaultWarehouseFromCatalog,
  warehouseFormPatchFromSelection,
} from '@/lib/warehouse-lookup'
import { getAllProducts } from '@/lib/stock-service'
import { resolveCatalogSku } from '@/lib/stock-sku'

export type QuoteLineKind = 'product' | 'manual'

export type QuoteLineItem = {
  id: string
  sku: string
  productId?: string
  lineKind?: QuoteLineKind
  description: string
  quantity: number
  priceCurrency?: import('@/lib/currency').ProductCurrency
  unitPriceOriginal?: string
  unitPriceOriginalNum?: number
  unitPrice: string
  discount: string
  total: string
}

export type { QuoteStatusHistoryEntry }

export type QuoteDetail = QuoteListItem & {
  companyId?: string
  contactId?: string
  customerKind?: import('@/lib/sale-customer').SaleCustomerKind
  contactName: string
  contactEmail: string
  version: string
  currency: string
  exchangeRateDate?: string | null
  exchangeRateUf?: number | null
  exchangeRateUsd?: number | null
  exchangeRateEur?: number | null
  description: string
  subtotal: string
  discountPercent: string
  discountAmount: string
  taxPercent: string
  taxAmount: string
  paymentTerms: string
  deliveryTerms: string
  billingAddress: string
  destinationWarehouseId?: string
  destinationWarehouse: string
  deliveryAddress: string
  sentAt?: string
  lineItems: QuoteLineItem[]
  statusHistory: QuoteStatusHistoryEntry[]
  terms: string
  internalNotes: string
  activities: ContactActivity[]
  notes: ContactNote[]
  files: QuoteFile[]
}

export function resolveQuoteListItem(id: string): QuoteListItem {
  const fromRegistry = getRegistryQuoteById(id)
  if (fromRegistry) return { ...fromRegistry, id }

  const direct = quoteListSeed.find((q) => q.id === id)
  if (direct) return { ...direct, id }

  const pageMatch = /^cotizaciones-(\d+)$/.exec(id)
  if (pageMatch) {
    const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
    const seed = quoteListSeed[idx % quoteListSeed.length]
    return { ...seed!, id }
  }

  return { ...quoteListSeed[0]!, id }
}

function parseAmount(value: string): number {
  return Number.parseInt(value.replace(/[^\d]/g, ''), 10) || 0
}

function formatAmount(value: number): string {
  return `$${value.toLocaleString('es-CL')}`
}

function productIdForSku(sku: string): string | undefined {
  const catalogSku = resolveCatalogSku(sku)
  return productForInventorySku(getAllProducts(), catalogSku)?.id
}

function lineItemsFor(quote: QuoteListItem, id: string): QuoteLineItem[] {
  const totalNum = parseAmount(quote.amount)
  const main = Math.round(totalNum * 0.72)
  const secondary = totalNum - main

  const lines: QuoteLineItem[] = [
    {
      id: `${id}-li-1`,
      sku: 'LIC-CLOUD-ENT',
      productId: productIdForSku('LIC-CLOUD-ENT'),
      description: quote.title,
      quantity: 1,
      unitPrice: formatAmount(main),
      discount: '0%',
      total: formatAmount(main),
    },
    {
      id: `${id}-li-2`,
      sku: 'SRV-IMPL-ONB',
      productId: productIdForSku('SRV-IMPL-ONB'),
      description: 'Implementación y capacitación',
      quantity: 1,
      unitPrice: formatAmount(Math.round(secondary * 1.1)),
      discount: '10%',
      total: formatAmount(secondary),
    },
  ]

  return lines
}

function statusHistoryFor(
  id: string,
  journeyStage: QuoteJourneyStage,
): QuoteStatusHistoryEntry[] {
  const chains: Partial<Record<QuoteJourneyStage, QuoteJourneyStage[]>> = {
    Borrador: ['Borrador'],
    'En revisión interna': ['Borrador', 'En revisión interna'],
    Enviada: ['Borrador', 'En revisión interna', 'Enviada'],
    'En negociación': ['Borrador', 'En revisión interna', 'Enviada', 'En negociación'],
    Aceptada: ['Borrador', 'En revisión interna', 'Enviada', 'En negociación', 'Aceptada'],
    'En espera cliente': ['Borrador', 'En revisión interna', 'Enviada', 'En espera cliente'],
    Rechazada: ['Borrador', 'En revisión interna', 'Enviada', 'Rechazada'],
    Vencida: ['Borrador', 'En revisión interna', 'Enviada', 'Vencida'],
    Cancelada: ['Borrador', 'En revisión interna', 'Cancelada'],
  }

  const chain = chains[journeyStage] ?? ['Borrador', journeyStage]
  const dates = ['12 may 2024', '13 may 2024', '14 may 2024', '16 may 2024', '18 may 2024']

  return chain.map((status, i) => {
    const entry: QuoteStatusHistoryEntry = {
      id: `${id}-st-${i}`,
      status,
      at: dates[i] ?? dates[dates.length - 1]!,
      note:
        status === journeyStage
          ? status === 'Enviada'
            ? 'Enviada al cliente por email'
            : 'Estado actual'
          : undefined,
    }
    const prev = chain[i - 1]
    if (
      status === journeyStage &&
      isOffRouteStage(journeyStage) &&
      prev &&
      isMainLineStage(prev)
    ) {
      entry.pausedFromMain = prev as QuoteJourneyMainStage
    }
    return entry
  })
}

export function getQuoteDetail(id: string): QuoteDetail {
  const base = resolveQuoteListItem(id)
  const journeyStage = resolveQuoteJourneyStage(
    id,
    legacyStatusToQuoteJourney(base.status),
  )
  const quoteBase = { ...base, status: journeyStage }
  const opp = opportunityListSeed.find((o) => o.id === quoteBase.opportunityId)
  const idx = quoteListSeed.findIndex((q) => q.id === quoteBase.id)
  const totalNum = parseAmount(quoteBase.amount)
  const discountPct = idx % 3 === 0 ? 5 : idx % 2 === 0 ? 10 : 0
  const discountAmount = Math.round((totalNum * discountPct) / 100)
  const subtotalNum = totalNum + discountAmount
  const taxPct = getDefaultVatPercent()
  const taxAmount = Math.round((totalNum * taxPct) / 100)

  const customerKind: import('@/lib/sale-customer').SaleCustomerKind =
    quoteBase.customerKind ??
    (opp?.contactId && idx % 2 === 1 ? 'contacto' : 'empresa')

  const stored = loadQuoteDetailOverride(id)

  const quote: QuoteDetail = {
    ...quoteBase,
    ...(stored?.amount ? { amount: stored.amount } : {}),
    ...(stored?.subtotal ? { subtotal: stored.subtotal } : {}),
    ...(stored?.discountPercent ? { discountPercent: stored.discountPercent } : {}),
    ...(stored?.discountAmount ? { discountAmount: stored.discountAmount } : {}),
    ...(stored?.taxPercent ? { taxPercent: stored.taxPercent } : {}),
    ...(stored?.taxAmount ? { taxAmount: stored.taxAmount } : {}),
    ...(stored?.description ? { description: stored.description } : {}),
    ...(stored?.destinationWarehouseId
      ? { destinationWarehouseId: stored.destinationWarehouseId }
      : {}),
    ...(stored?.destinationWarehouse
      ? { destinationWarehouse: stored.destinationWarehouse }
      : {}),
    ...(stored?.deliveryAddress ? { deliveryAddress: stored.deliveryAddress } : {}),
    lineItems:
      stored?.lineItems && stored.lineItems.length > 0
        ? stored.lineItems
        : lineItemsFor(quoteBase, id),
    customerKind,
    companyId: quoteBase.companyId ?? opp?.companyId,
    contactId: quoteBase.contactId ?? opp?.contactId,
    contactName: opp?.contactName ?? 'Contacto comercial',
    contactEmail: `${(opp?.contactName ?? 'contacto').split(' ')[0]?.toLowerCase() ?? 'contacto'}@${quoteBase.companyName.toLowerCase().replace(/\s+/g, '')}.com`,
    version: idx % 4 === 0 ? 'v2' : 'v1',
    currency: 'CLP',
    description: `Propuesta comercial para ${quoteBase.companyName} — ${quoteBase.title}. Incluye alcance, plazos y condiciones de pago acordadas con el área de compras.`,
    subtotal: formatAmount(subtotalNum),
    discountPercent: `${discountPct}%`,
    discountAmount: discountAmount > 0 ? `−${formatAmount(discountAmount)}` : '$0',
    taxPercent: formatVatPercentLabel(taxPct),
    taxAmount: formatAmount(taxAmount),
    paymentTerms: '30 días fecha factura',
    deliveryTerms: '15 días hábiles desde OC',
    billingAddress: `${quoteBase.companyName}, Av. Providencia 1200, Santiago`,
    ...(() => {
      const catalog = loadCatalogSettings()
      const wh = defaultWarehouseFromCatalog(catalog.warehouses)
      const patch = warehouseFormPatchFromSelection(wh)
      return {
        destinationWarehouseId: patch.warehouseId || undefined,
        destinationWarehouse: patch.warehouse,
        deliveryAddress: patch.deliveryAddress,
      }
    })(),
    sentAt: journeyStage !== 'Borrador' && journeyStage !== 'En revisión interna'
      ? '14 may 2024, 10:15'
      : undefined,
    statusHistory: statusHistoryFor(id, journeyStage),
    terms:
      'Validez de la oferta según fecha indicada. Precios en CLP + IVA. Cambios de alcance sujetos a change order. Propiedad intelectual según contrato marco.',
    internalNotes:
      'Margen objetivo 32%. Aprobación descuento: gerente comercial. Competidor mencionado en última reunión.',
    activities: buildQuoteActivitiesForDetail(quoteBase),
    notes: [
      {
        id: `qt-note-${id}-1`,
        body: '<p>Cliente solicitó dividir pago en 2 hitos: 60% al inicio, 40% contra entrega.</p>',
        author: quoteBase.owner,
        when: '15 may, 11:00',
      },
    ],
    files: [],
  }
  quote.notes = mergeEntityNotesForMock('cotizacion', id, quote.notes ?? [])
  return quote
}
