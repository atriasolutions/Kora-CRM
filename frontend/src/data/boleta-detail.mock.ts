import type { ContactActivity, ContactNote } from '@/data/contact-detail.mock'
import type { InvoiceLineItem } from '@/data/invoice-detail.mock'
import { getRegistryBoletaById } from '@/data/boletas-registry-store'
import { boletaListSeed } from '@/data/boletas.mock'
import type { BoletaListItem } from '@/data/boletas.mock'
import { formatBoletaAmount } from '@/lib/boleta-display'
import { mergeEntityNotesForMock } from '@/lib/entity-notes-storage'
import { loadBoletaDetailOverride } from '@/lib/boleta-detail-storage'
import { computeInvoiceTotals } from '@/lib/invoice-line-item'
import {
  legacyStatusToBoletaJourney,
  resolveBoletaJourneyStage,
  type BoletaJourneyStage,
  type BoletaStatusHistoryEntry,
} from '@/lib/boleta-journey'
import { getBoletaFiles, type BoletaFile } from '@/lib/boleta-files'

export type BoletaDetail = Omit<BoletaListItem, 'notes'> & {
  description: string
  subtotal: string
  taxableSubtotal?: string
  exemptSubtotal?: string
  taxPercent: string
  taxAmount?: string
  globalDiscount?: string
  internalNotes: string
  statusHistory: BoletaStatusHistoryEntry[]
  lineItems: InvoiceLineItem[]
  activities: ContactActivity[]
  notes: ContactNote[]
  files: BoletaFile[]
  exchangeRateDate?: string | null
  exchangeRateUf?: number | null
  exchangeRateUsd?: number | null
  exchangeRateEur?: number | null
}

export function resolveBoletaListItem(id: string): BoletaListItem {
  const fromRegistry = getRegistryBoletaById(id)
  if (fromRegistry) return { ...fromRegistry, id }

  const direct = boletaListSeed.find((bol) => bol.id === id)
  if (direct) return { ...direct, id }

  const pageMatch = /^boletas-(\d+)$/.exec(id)
  if (pageMatch) {
    const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
    const seed = boletaListSeed[idx % boletaListSeed.length]
    return { ...seed!, id }
  }

  return { ...boletaListSeed[0]!, id }
}

function lineItemsFor(boleta: BoletaListItem, id: string): InvoiceLineItem[] {
  const override = loadBoletaDetailOverride(id)
  if (override?.lineItems && override.lineItems.length > 0) {
    return override.lineItems
  }

  const main = Math.round(boleta.amountNum * 0.85)
  const secondary = boleta.amountNum - main

  return [
    {
      id: `${id}-li-1`,
      sku: 'SRV-VENTA',
      description: `Venta — ${boleta.buyerName}`,
      quantity: 1,
      unitPrice: formatBoletaAmount(main),
      discount: '0%',
      total: formatBoletaAmount(main),
    },
    {
      id: `${id}-li-2`,
      sku: 'PROD-MISC',
      description: 'Productos varios',
      quantity: 1,
      unitPrice: formatBoletaAmount(secondary),
      discount: '0%',
      total: formatBoletaAmount(secondary),
    },
  ]
}

function statusHistoryFor(id: string, journeyStage: BoletaJourneyStage): BoletaStatusHistoryEntry[] {
  const chains: Partial<Record<BoletaJourneyStage, BoletaJourneyStage[]>> = {
    Borrador: ['Borrador'],
    Emitida: ['Borrador', 'Emitida'],
    Anulada: ['Borrador', 'Anulada'],
  }
  const chain = chains[journeyStage] ?? ['Borrador', journeyStage]
  const dates = ['1 may 2024', '5 may 2024', '12 may 2024']
  return chain.map((status, i) => ({
    id: `${id}-st-${i}`,
    status,
    at: dates[i] ?? dates[dates.length - 1]!,
    note: status === journeyStage ? 'Estado actual' : undefined,
  }))
}

function activitiesFor(boleta: BoletaListItem, id: string): ContactActivity[] {
  return [
    {
      id: `${id}-act-1`,
      type: 'nota',
      title: `Boleta ${boleta.number}`,
      when: boleta.issueDate,
      author: boleta.owner,
      relatedType: 'boleta',
      relatedId: id,
      relatedName: boleta.number,
    },
  ]
}

export function getBoletaDetail(id: string): BoletaDetail {
  const baseRaw = resolveBoletaListItem(id)
  const override = loadBoletaDetailOverride(id)
  const journeyStage = resolveBoletaJourneyStage(
    id,
    legacyStatusToBoletaJourney(baseRaw.status),
  )
  const base = { ...baseRaw, status: journeyStage }
  const lineItems = lineItemsFor(base, id)
  const totals = computeInvoiceTotals(lineItems)
  const amountNum = override?.amount
    ? Number.parseInt(override.amount.replace(/[^\d]/g, ''), 10) || base.amountNum
    : totals.amountNum
  const amount = override?.amount ?? totals.amount

  return {
    ...base,
    amount,
    amountNum,
    description: `Boleta emitida a ${base.buyerName}. Documento de venta al consumidor final.`,
    subtotal: override?.subtotal ?? totals.subtotal,
    taxableSubtotal: override?.taxableSubtotal ?? totals.taxableSubtotal,
    exemptSubtotal: override?.exemptSubtotal ?? totals.exemptSubtotal,
    taxPercent: override?.taxPercent ?? totals.taxPercent,
    taxAmount: override?.taxAmount ?? totals.taxAmount,
    globalDiscount: totals.discountPercent,
    internalNotes: override?.notes ?? base.notes ?? '',
    statusHistory: statusHistoryFor(id, journeyStage),
    lineItems,
    activities: activitiesFor(base, id),
    notes: mergeEntityNotesForMock('boleta', id, [
      {
        id: `${id}-note-1`,
        body: '<p>Comprador solicitó copia impresa de la boleta.</p>',
        author: base.owner,
        when: '14 may, 09:15',
      },
    ]),
    files: getBoletaFiles(id, base.owner),
  }
}
