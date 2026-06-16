import type { InvoiceLineItemDto } from '../types/invoice.js'
import { parseMoneyToCents } from '../utils/money.js'

export type DteLineInput = {
  totalCents: number
  subjectToVat: boolean
  description: string
  quantity: number
  unitPriceCents: number
}

export type InvoiceDteAmounts = {
  taxableCents: number
  exemptCents: number
  taxCents: number
  totalCents: number
}

export type InvoiceDocumentKind = 'invoice' | 'credit_note' | 'debit_note'

export function lineSubjectToVat(subjectToVat: boolean | undefined): boolean {
  return subjectToVat !== false
}

export function dteLineFromDto(line: InvoiceLineItemDto): DteLineInput {
  return {
    totalCents: parseMoneyToCents(line.total),
    subjectToVat: lineSubjectToVat(line.subjectToVat),
    description: line.description,
    quantity: line.quantity,
    unitPriceCents: parseMoneyToCents(line.unitPrice),
  }
}

export function dteLineFromComputed(line: {
  totalCents: number
  subjectToVat: boolean
  description: string
  quantity: number
  unitPriceCents: number
}): DteLineInput {
  return {
    totalCents: line.totalCents,
    subjectToVat: lineSubjectToVat(line.subjectToVat),
    description: line.description,
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
  }
}

export function computeInvoiceDteAmounts(
  lines: DteLineInput[],
  globalDiscountPct: number,
  vatPercent: number,
): InvoiceDteAmounts {
  let taxableNum = 0
  let exemptNum = 0

  for (const line of lines) {
    const net = Math.max(0, line.totalCents)
    if (lineSubjectToVat(line.subjectToVat)) {
      taxableNum += net
    } else {
      exemptNum += net
    }
  }

  const linesSubtotal = taxableNum + exemptNum
  const discountAmount = Math.round((linesSubtotal * Math.max(0, globalDiscountPct)) / 100)

  let taxableAfter = taxableNum
  let exemptAfter = exemptNum
  if (linesSubtotal > 0 && discountAmount > 0) {
    const taxableDiscount = Math.round((discountAmount * taxableNum) / linesSubtotal)
    const exemptDiscount = discountAmount - taxableDiscount
    taxableAfter = taxableNum - taxableDiscount
    exemptAfter = exemptNum - exemptDiscount
  }

  const taxCents = Math.round((taxableAfter * Math.max(0, vatPercent)) / 100)
  const totalCents = taxableAfter + exemptAfter + taxCents

  return {
    taxableCents: taxableAfter,
    exemptCents: exemptAfter,
    taxCents,
    totalCents,
  }
}

/** 34 si todas las líneas son exentas; 33 en cualquier otro caso (incluye mixtas). */
export function resolveInvoiceDteType(lines: DteLineInput[]): 33 | 34 {
  if (lines.length === 0) return 33
  const allExempt = lines.every((line) => !lineSubjectToVat(line.subjectToVat))
  return allExempt ? 34 : 33
}

export function resolveAdjustmentDteType(
  documentKind: 'credit_note' | 'debit_note',
): 61 | 56 {
  return documentKind === 'credit_note' ? 61 : 56
}

export function resolveDteTypeForDocument(
  documentKind: InvoiceDocumentKind,
  lines: DteLineInput[],
): 33 | 34 | 56 | 61 {
  if (documentKind === 'credit_note') return 61
  if (documentKind === 'debit_note') return 56
  return resolveInvoiceDteType(lines)
}

export function buildDteItemsFromLines(lines: DteLineInput[]) {
  return lines.map((line) => ({
    nombre: line.description,
    cantidad: line.quantity,
    precioUnitario: Math.round(line.unitPriceCents / 100),
    montoItem: Math.round(line.totalCents / 100),
    exento: !lineSubjectToVat(line.subjectToVat),
  }))
}

export function buildDteXmlAmounts(
  dteType: 33 | 34 | 56 | 61,
  amounts: InvoiceDteAmounts,
): {
  montoNeto?: number
  montoExento?: number
  iva?: number
  montoTotal: number
} {
  const total = Math.round(amounts.totalCents / 100)

  if (dteType === 34) {
    return {
      montoExento: Math.round(amounts.exemptCents / 100),
      montoTotal: total,
    }
  }

  const payload: {
    montoNeto?: number
    montoExento?: number
    iva?: number
    montoTotal: number
  } = {
    montoTotal: total,
  }

  const neto = Math.round(amounts.taxableCents / 100)
  const exento = Math.round(amounts.exemptCents / 100)
  const iva = Math.round(amounts.taxCents / 100)

  if (neto > 0) payload.montoNeto = neto
  if (exento > 0) payload.montoExento = exento
  if (iva > 0) payload.iva = iva

  return payload
}
