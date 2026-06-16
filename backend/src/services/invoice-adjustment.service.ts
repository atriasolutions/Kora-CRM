import { badRequest } from '../middleware/errors.js'
import * as invoicesRepo from '../repositories/invoices.repository.js'
import type { AuditActor } from '../types/audit.js'
import type {
  CreateInvoiceAdjustmentInput,
  InvoiceDetail,
  InvoiceLineItemInput,
  InvoiceReferenceCode,
} from '../types/invoice.js'

function mapSourceLineToInput(
  line: InvoiceDetail['lineItems'][number],
  patch?: Partial<InvoiceLineItemInput>,
): InvoiceLineItemInput {
  return {
    id: line.id,
    productId: line.productId,
    sku: line.sku,
    productName: line.description,
    description: line.description,
    quantity: patch?.quantity ?? line.quantity,
    unitPrice: patch?.unitPrice ?? line.unitPrice,
    unitPriceOriginal: line.unitPriceOriginalNum,
    priceCurrency: line.priceCurrency,
    discount: patch?.discount ?? line.discount,
    subjectToVat: patch?.subjectToVat ?? line.subjectToVat,
    deferredPayment: line.deferredPayment,
    deferredPaymentText: line.deferredPaymentText,
  }
}

async function validateCreditNoteTotal(
  source: InvoiceDetail,
  newTotalCents: number,
): Promise<void> {
  const credited = await invoicesRepo.sumEmittedAdjustmentTotalCents(
    source.id,
    'credit_note',
  )
  const sourceTotal = Math.round(source.amountNum * 100)
  assertCreditNoteWithinBalance(sourceTotal, credited, newTotalCents)
}

async function validateDebitNoteTotal(
  source: InvoiceDetail,
  newTotalCents: number,
): Promise<void> {
  const debited = await invoicesRepo.sumEmittedAdjustmentTotalCents(
    source.id,
    'debit_note',
  )
  const sourceTotal = Math.round(source.amountNum * 100)
  assertDebitNoteWithinBalance(sourceTotal, debited, newTotalCents)
}

export function resolveAdjustmentReferenceCode(
  mode: CreateInvoiceAdjustmentInput['mode'],
  documentKind: 'credit_note' | 'debit_note',
  explicit?: InvoiceReferenceCode,
): InvoiceReferenceCode {
  if (explicit) return explicit
  if (documentKind === 'credit_note' && mode === 'full') return 1
  return 3
}

export function assertCreditNoteWithinBalance(
  sourceTotalCents: number,
  creditedCents: number,
  newTotalCents: number,
): void {
  const remaining = Math.max(0, sourceTotalCents - creditedCents)
  if (newTotalCents > remaining) {
    throw badRequest(
      remaining === 0
        ? 'Esta factura ya fue acreditada por completo.'
        : 'El monto de la nota de crédito supera el saldo disponible de la factura origen.',
    )
  }
}

export function assertDebitNoteWithinBalance(
  sourceTotalCents: number,
  debitedCents: number,
  newTotalCents: number,
): void {
  if (debitedCents + newTotalCents > sourceTotalCents) {
    throw badRequest(
      'El monto acumulado de notas de débito supera el total de la factura origen.',
    )
  }
}

function resolveReferenceCode(
  mode: CreateInvoiceAdjustmentInput['mode'],
  documentKind: 'credit_note' | 'debit_note',
  explicit?: InvoiceReferenceCode,
): InvoiceReferenceCode {
  return resolveAdjustmentReferenceCode(mode, documentKind, explicit)
}

function buildFullAdjustmentLines(source: InvoiceDetail): InvoiceLineItemInput[] {
  return source.lineItems.map((line) => mapSourceLineToInput(line))
}

function assertPartialLines(
  source: InvoiceDetail,
  lines: InvoiceLineItemInput[],
): InvoiceLineItemInput[] {
  if (!lines.length) throw badRequest('Selecciona al menos una línea para el ajuste parcial.')
  const byId = new Map(source.lineItems.map((line) => [line.id, line]))

  return lines.map((input) => {
    const sourceLine = input.id ? byId.get(input.id) : undefined
    if (!sourceLine) {
      throw badRequest('Una de las líneas seleccionadas no pertenece a la factura origen.')
    }
    const qty = input.quantity ?? sourceLine.quantity
    if (qty <= 0 || qty > sourceLine.quantity) {
      throw badRequest(`Cantidad inválida para «${sourceLine.description}».`)
    }
    return mapSourceLineToInput(sourceLine, {
      quantity: qty,
      unitPrice: input.unitPrice ?? sourceLine.unitPrice,
      discount: input.discount ?? sourceLine.discount,
      subjectToVat: input.subjectToVat ?? sourceLine.subjectToVat,
    })
  })
}

async function createAdjustment(
  sourceInvoiceId: string,
  documentKind: 'credit_note' | 'debit_note',
  input: CreateInvoiceAdjustmentInput,
  actor: AuditActor,
): Promise<InvoiceDetail> {
  const source = await invoicesRepo.getInvoiceById(sourceInvoiceId)
  const referenceCode = resolveReferenceCode(input.mode, documentKind, input.referenceCode)
  const lineItems =
    input.mode === 'full'
      ? buildFullAdjustmentLines(source)
      : assertPartialLines(source, input.lineItems ?? [])

  const totalCents = await invoicesRepo.estimateAdjustmentTotalCents(
    lineItems,
    source.issueDate,
    source.globalDiscount,
  )

  if (documentKind === 'credit_note') {
    await validateCreditNoteTotal(source, totalCents)
  } else {
    await validateDebitNoteTotal(source, totalCents)
  }

  if (!input.referenceReason?.trim()) {
    throw badRequest('Indica el motivo del ajuste.')
  }

  return invoicesRepo.createAdjustmentInvoice(
    sourceInvoiceId,
    documentKind,
    {
      referenceReason: input.referenceReason.trim(),
      referenceCode,
      lineItems,
      globalDiscount: source.globalDiscount,
    },
    actor,
  )
}

export async function createCreditNote(
  sourceInvoiceId: string,
  input: CreateInvoiceAdjustmentInput,
  actor: AuditActor,
): Promise<InvoiceDetail> {
  return createAdjustment(sourceInvoiceId, 'credit_note', input, actor)
}

export async function createDebitNote(
  sourceInvoiceId: string,
  input: CreateInvoiceAdjustmentInput,
  actor: AuditActor,
): Promise<InvoiceDetail> {
  return createAdjustment(sourceInvoiceId, 'debit_note', input, actor)
}
