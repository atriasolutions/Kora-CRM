import { STORAGE_PREFIX } from '@/config/brand'
import { isLocalDetailStorageActive } from '@/lib/local-detail-storage'
import type { InvoiceLineItem } from '@/data/invoice-detail.mock'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-boleta-details`

export type BoletaDetailOverride = {
  lineItems?: InvoiceLineItem[]
  subtotal?: string
  taxableSubtotal?: string
  exemptSubtotal?: string
  taxPercent?: string
  taxAmount?: string
  amount?: string
  notes?: string
}

function readAll(): Record<string, BoletaDetailOverride> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, BoletaDetailOverride>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, BoletaDetailOverride>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* quota */
  }
}

export function loadBoletaDetailOverride(boletaId: string): BoletaDetailOverride | null {
  if (!isLocalDetailStorageActive()) return null
  return readAll()[boletaId] ?? null
}

export function persistBoletaDetailOverride(boletaId: string, override: BoletaDetailOverride) {
  if (!isLocalDetailStorageActive()) return
  const all = readAll()
  all[boletaId] = { ...all[boletaId], ...override }
  writeAll(all)
}

export function removeBoletaDetailOverride(boletaId: string) {
  if (!isLocalDetailStorageActive()) return
  const all = readAll()
  if (!all[boletaId]) return
  delete all[boletaId]
  writeAll(all)
}
