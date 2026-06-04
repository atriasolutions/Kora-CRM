import type { ContactActivity, ContactNote } from '@/data/contact-detail.mock'
import { getRegistryInvoiceById } from '@/data/invoices-registry-store'
import { invoiceListSeed } from '@/data/invoices.mock'
import type { InvoiceListItem } from '@/data/invoices.mock'
import { getQuoteDetail } from '@/data/quote-detail.mock'
import { getAllKnownQuotes } from '@/data/quotes-registry-store'
import { formatAmount } from '@/lib/invoice-display'
import { mergeEntityNotesForMock } from '@/lib/entity-notes-storage'
import { loadInvoiceDetailOverride } from '@/lib/invoice-detail-storage'
import { computeInvoiceTotals } from '@/lib/invoice-line-item'
import { buildInvoiceActivitiesForDetail } from '@/lib/invoice-activities'
import { getInvoiceFiles, type InvoiceFile } from '@/lib/invoice-files'
import {
  isMainLineStage,
  isOffRouteStage,
  legacyStatusToInvoiceJourney,
  resolveInvoiceJourneyStage,
  resolveInvoiceSiiNumber,
  type InvoiceJourneyMainStage,
  type InvoiceJourneyStage,
  type InvoiceStatusHistoryEntry,
} from '@/lib/invoice-journey'

export type InvoiceLineKind = 'product' | 'manual'

export type InvoiceLineItem = {
  id: string
  sku: string
  productId?: string
  lineKind?: InvoiceLineKind
  description: string
  quantity: number
  priceCurrency?: import('@/lib/currency').ProductCurrency
  unitPriceOriginal?: string
  unitPriceOriginalNum?: number
  unitPrice: string
  discount: string
  total: string
  /** Si es true (por defecto), la línea suma al neto afecto y al cálculo de IVA. */
  subjectToVat?: boolean
}

export type InvoicePayment = {
  id: string
  date: string
  amount: string
  method: string
  reference: string
  status: 'Confirmado' | 'Pendiente' | 'Rechazado'
}

export type InvoiceDetail = InvoiceListItem & {
  description: string
  quoteCode?: string
  subtotal: string
  taxableSubtotal?: string
  exemptSubtotal?: string
  taxPercent: string
  taxAmount: string
  balanceDue: string
  paidAmountNum: number
  internalNotes: string
  statusHistory: InvoiceStatusHistoryEntry[]
  lineItems: InvoiceLineItem[]
  payments: InvoicePayment[]
  activities: ContactActivity[]
  notes: ContactNote[]
  files: InvoiceFile[]
  exchangeRateDate?: string | null
  exchangeRateUf?: number | null
  exchangeRateUsd?: number | null
  exchangeRateEur?: number | null
}

export function resolveInvoiceListItem(id: string): InvoiceListItem {
  const fromRegistry = getRegistryInvoiceById(id)
  if (fromRegistry) return { ...fromRegistry, id }

  const direct = invoiceListSeed.find((inv) => inv.id === id)
  if (direct) return { ...direct, id }

  const pageMatch = /^facturacion-(\d+)$/.exec(id)
  if (pageMatch) {
    const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
    const seed = invoiceListSeed[idx % invoiceListSeed.length]
    return { ...seed!, id }
  }

  return { ...invoiceListSeed[0]!, id }
}

function lineItemsFor(invoice: InvoiceListItem, id: string): InvoiceLineItem[] {
  const override = loadInvoiceDetailOverride(id)
  if (override?.lineItems && override.lineItems.length > 0) {
    return override.lineItems
  }

  if (invoice.quoteId) {
    const quote = getQuoteDetail(invoice.quoteId)
    return quote.lineItems.map((li, index) => ({
      id: `${id}-li-${index + 1}`,
      sku: li.sku,
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      discount: li.discount,
      total: li.total,
    }))
  }

  const main = Math.round(invoice.amountNum * 0.78)
  const secondary = invoice.amountNum - main

  return [
    {
      id: `${id}-li-1`,
      sku: 'SRV-CONSULT',
      description: `Servicios profesionales — ${invoice.client}`,
      quantity: 1,
      unitPrice: formatAmount(main),
      discount: '0%',
      total: formatAmount(main),
    },
    {
      id: `${id}-li-2`,
      sku: 'LIC-SOFT',
      description: 'Licencias y soporte',
      quantity: 1,
      unitPrice: formatAmount(Math.round(secondary * 1.1)),
      discount: '10%',
      total: formatAmount(secondary),
    },
  ]
}

function paymentsFor(invoice: InvoiceListItem, id: string): InvoicePayment[] {
  if (invoice.status === 'Borrador' || invoice.status === 'Anulada') return []

  if (invoice.status === 'Pagada') {
    return [
      {
        id: `${id}-pay-1`,
        date: invoice.dueDate,
        amount: invoice.amount,
        method: invoice.paymentMethod,
        reference: `PAG-${id.toUpperCase()}`,
        status: 'Confirmado',
      },
    ]
  }

  if (invoice.status === 'Pendiente') {
    return [
      {
        id: `${id}-pay-1`,
        date: invoice.issueDate,
        amount: formatAmount(Math.round(invoice.amountNum * 0.3)),
        method: invoice.paymentMethod,
        reference: `ANT-${id.toUpperCase()}`,
        status: 'Confirmado',
      },
    ]
  }

  return []
}

function statusHistoryFor(
  id: string,
  journeyStage: InvoiceJourneyStage,
): InvoiceStatusHistoryEntry[] {
  const chains: Partial<Record<InvoiceJourneyStage, InvoiceJourneyStage[]>> = {
    Borrador: ['Borrador'],
    Pendiente: ['Borrador', 'Pendiente'],
    Pagada: ['Borrador', 'Pendiente', 'Pagada'],
    Vencida: ['Borrador', 'Pendiente', 'Vencida'],
    Anulada: ['Borrador', 'Anulada'],
  }

  const chain = chains[journeyStage] ?? ['Borrador', journeyStage]
  const dates = ['1 may 2024', '5 may 2024', '12 may 2024', '18 may 2024']

  return chain.map((status, i) => {
    const entry: InvoiceStatusHistoryEntry = {
      id: `${id}-st-${i}`,
      status,
      at: dates[i] ?? dates[dates.length - 1]!,
      note: status === journeyStage ? 'Estado actual' : undefined,
    }
    const prev = chain[i - 1]
    if (
      status === journeyStage &&
      isOffRouteStage(journeyStage) &&
      prev &&
      isMainLineStage(prev)
    ) {
      entry.pausedFromMain = prev as InvoiceJourneyMainStage
    }
    return entry
  })
}

export function getInvoiceDetail(id: string): InvoiceDetail {
  const baseRaw = resolveInvoiceListItem(id)
  const override = loadInvoiceDetailOverride(id)
  const journeyStage = resolveInvoiceJourneyStage(
    id,
    legacyStatusToInvoiceJourney(baseRaw.status),
  )
  const siiNumber = resolveInvoiceSiiNumber(id, baseRaw.siiNumber)
  const base = { ...baseRaw, status: journeyStage, siiNumber }
  const lineItems = lineItemsFor(base, id)
  const totals = computeInvoiceTotals(lineItems)
  const amountNum = override?.amount
    ? Number.parseInt(override.amount.replace(/[^\d]/g, ''), 10) || base.amountNum
    : totals.amountNum
  const amount = override?.amount ?? totals.amount

  const quote = base.quoteId
    ? getAllKnownQuotes().find((q) => q.id === base.quoteId)
    : undefined

  const paidAmountNum =
    base.status === 'Pagada'
      ? base.amountNum
      : base.status === 'Pendiente'
        ? Math.round(base.amountNum * 0.3)
        : 0

  return {
    ...base,
    amount,
    amountNum,
    description: `Factura emitida a ${base.client}. Documento de cobro asociado a entrega de servicios y licencias.`,
    quoteCode: quote?.code,
    subtotal: override?.subtotal ?? totals.subtotal,
    taxableSubtotal: override?.taxableSubtotal ?? totals.taxableSubtotal,
    exemptSubtotal: override?.exemptSubtotal ?? totals.exemptSubtotal,
    taxPercent: override?.taxPercent ?? totals.taxPercent,
    taxAmount: override?.taxAmount ?? totals.taxAmount,
    balanceDue:
      base.status === 'Pagada' ? '$0' : formatAmount(amountNum - paidAmountNum),
    paidAmountNum,
    internalNotes: 'Condiciones de pago según contrato marco. Enviar comprobante a cobranzas.',
    statusHistory: statusHistoryFor(id, journeyStage),
    lineItems,
    payments: paymentsFor(base, id),
    activities: buildInvoiceActivitiesForDetail(base),
    notes: mergeEntityNotesForMock('factura', id, [
      {
        id: `${id}-note-1`,
        body: '<p>Cliente solicitó factura con OC interna antes del pago.</p>',
        author: base.owner,
        when: '14 may, 09:15',
      },
    ]),
    files: getInvoiceFiles(id, base.owner),
  }
}
