import { STORAGE_PREFIX } from '@/config/brand'
import { isLocalDetailStorageActive } from '@/lib/local-detail-storage'
import type { InvoiceLineItem } from '@/data/invoice-detail.mock'
import type { InvoiceSourceMode } from '@/lib/invoice-create'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-invoice-details`

export type InvoiceDetailOverride = {
  lineItems?: InvoiceLineItem[]
  subtotal?: string
  taxableSubtotal?: string
  exemptSubtotal?: string
  taxPercent?: string
  taxAmount?: string
  amount?: string
  invoiceSource?: InvoiceSourceMode
  description?: string
}

function readAll(): Record<string, InvoiceDetailOverride> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, InvoiceDetailOverride>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, InvoiceDetailOverride>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* quota */
  }
}

export function loadInvoiceDetailOverride(
  invoiceId: string,
): InvoiceDetailOverride | null {
  if (!isLocalDetailStorageActive()) return null
  return readAll()[invoiceId] ?? null
}

export function persistInvoiceDetailOverride(
  invoiceId: string,
  override: InvoiceDetailOverride,
) {
  if (!isLocalDetailStorageActive()) return
  const all = readAll()
  all[invoiceId] = { ...all[invoiceId], ...override }
  writeAll(all)
}

export function removeInvoiceDetailOverride(invoiceId: string) {
  if (!isLocalDetailStorageActive()) return
  const all = readAll()
  if (!all[invoiceId]) return
  delete all[invoiceId]
  writeAll(all)
}
