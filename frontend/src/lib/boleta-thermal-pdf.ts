import { jsPDF } from 'jspdf'

import type { BoletaDetail } from '@/data/boleta-detail.mock'
import type { InvoiceLineItem } from '@/data/invoice-detail.mock'
import type { OrganizationSettings } from '@/types/organization-settings'
import { boletaBuyerDisplayName } from '@/lib/boleta-display'
import { chilePartsFromDate } from '@/lib/chile-timezone'
import { computeInvoiceTotals } from '@/lib/invoice-line-item'
import {
  organizationSettingsWithLogo,
  resolveOrganizationLogoUrl,
} from '@/lib/organization-logo'

const WIDTH_MM = 80
const MARGIN = 4
const LINE_H = 3.6
const GAP_SM = 1.2
const GAP_MD = 2
const GAP_LG = 3.5
const GAP_LOGO = 5
const RULE_BEFORE = 2
const RULE_AFTER = 2.8

const FONT_XS = 6
const FONT_SM = 7
const FONT_MD = 8
const FONT_LG = 9

const COL_TOTAL = WIDTH_MM - MARGIN
const COL_DESC_W = 52

function contentWidth(): number {
  return WIDTH_MM - MARGIN * 2
}

function asTrimmedString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  return String(value).trim()
}

function hasText(value: unknown): boolean {
  return asTrimmedString(value).length > 0
}

function moneyText(value: unknown, fallback: string): string {
  const text = asTrimmedString(value)
  if (text) return text
  if (typeof value === 'number' && Number.isFinite(value)) {
    return formatAmount(Math.round(value))
  }
  return fallback
}

function parseMoney(value: string | undefined | null): number {
  if (!value) return 0
  return Number.parseInt(String(value).replace(/[^\d]/g, ''), 10) || 0
}

function formatAmount(value: number): string {
  return `$${value.toLocaleString('es-CL')}`
}

function parseDiscountPercent(value: string | undefined | null): number {
  if (!value) return 0
  const n = Number.parseInt(String(value).replace(/[^\d]/g, ''), 10)
  return Number.isNaN(n) ? 0 : n
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatReceiptTime(boleta: BoletaDetail): string {
  const candidates = [
    asTrimmedString(boleta.printedAt),
    asTrimmedString(boleta.createdAt),
    asTrimmedString(boleta.updatedAt),
  ]
  for (const raw of candidates) {
    if (!raw) continue
    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) {
      const p = chilePartsFromDate(parsed)
      return `${pad2(p.hour)}:${pad2(p.minute)}`
    }
  }
  const now = chilePartsFromDate(new Date())
  return `${pad2(now.hour)}:${pad2(now.minute)}`
}

function formatAddressLine(settings: OrganizationSettings): string {
  const parts = [
    asTrimmedString(settings.address),
    asTrimmedString(settings.commune),
    asTrimmedString(settings.city),
  ].filter(Boolean)
  return parts.join(', ')
}

function resolveTotals(boleta: BoletaDetail) {
  const lineItems = boleta.lineItems ?? []
  const computed = computeInvoiceTotals(lineItems, {
    globalDiscountPercent: boleta.globalDiscount,
  })

  // Prefer totals recalculated from lines so the ticket matches the detalle.
  if (lineItems.length > 0) {
    return {
      lineItems,
      subtotal: computed.subtotal,
      taxAmount: computed.taxAmount,
      taxPercent: computed.taxPercent,
      amount: computed.amount,
      discountAmount: computed.discountAmount,
      globalDiscount: parseDiscountPercent(boleta.globalDiscount ?? computed.discountPercent),
    }
  }

  return {
    lineItems,
    subtotal: moneyText(boleta.subtotal, computed.subtotal),
    taxAmount: moneyText(boleta.taxAmount, computed.taxAmount),
    taxPercent: asTrimmedString(boleta.taxPercent) || computed.taxPercent,
    amount: moneyText(boleta.amount, computed.amount),
    discountAmount: computed.discountAmount,
    globalDiscount: parseDiscountPercent(boleta.globalDiscount ?? computed.discountPercent),
  }
}

function splitLines(doc: jsPDF, text: string, maxWidth: number, fontSize: number): string[] {
  doc.setFontSize(fontSize)
  return doc.splitTextToSize(text, maxWidth) as string[]
}

function drawWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  options?: { align?: 'left' | 'center' | 'right' },
): number {
  const lines = splitLines(doc, text, maxWidth, fontSize)
  const align = options?.align ?? 'left'
  for (const line of lines) {
    if (align === 'center') {
      doc.text(line, x + maxWidth / 2, y, { align: 'center' })
    } else if (align === 'right') {
      doc.text(line, x + maxWidth, y, { align: 'right' })
    } else {
      doc.text(line, x, y)
    }
    y += LINE_H
  }
  return y
}

function drawRule(doc: jsPDF, y: number, dashed = false): number {
  y += RULE_BEFORE
  doc.setDrawColor(140)
  doc.setLineWidth(0.2)
  if (dashed) {
    doc.setLineDashPattern([0.8, 0.8], 0)
  } else {
    doc.setLineDashPattern([], 0)
  }
  doc.line(MARGIN, y, WIDTH_MM - MARGIN, y)
  doc.setLineDashPattern([], 0)
  return y + RULE_AFTER
}

function estimateLineItemHeight(doc: jsPDF, line: InvoiceLineItem): number {
  const desc =
    asTrimmedString(line.description) ||
    asTrimmedString(line.sku) ||
    'Ítem'
  const descLines = splitLines(doc, desc, COL_DESC_W, FONT_SM).length
  return descLines * LINE_H + LINE_H + GAP_SM
}

function estimateHeightMm(doc: jsPDF, boleta: BoletaDetail, orgName: string): number {
  let h = MARGIN + 22 + GAP_LOGO
  h += splitLines(doc, orgName, contentWidth(), FONT_LG).length * LINE_H
  h += LINE_H * 10
  if (hasText(boletaBuyerDisplayName(boleta))) h += LINE_H * 3
  h += GAP_MD
  for (const line of boleta.lineItems ?? []) {
    h += estimateLineItemHeight(doc, line)
  }
  h += LINE_H * 12 + 16
  return Math.max(160, h)
}

async function tryAddLogo(doc: jsPDF, logoUrl: string | undefined, y: number): Promise<number> {
  if (!hasText(logoUrl)) return y
  try {
    const img = await loadImage(logoUrl)
    const maxW = 34
    const maxH = 16
    const ratio = Math.min(maxW / img.width, maxH / img.height)
    const w = img.width * ratio
    const h = img.height * ratio
    doc.addImage(img.data, img.format, (WIDTH_MM - w) / 2, y, w, h)
    return y + h + GAP_LOGO
  } catch {
    return y
  }
}

async function loadImage(
  url: string,
): Promise<{ data: string; width: number; height: number; format: string }> {
  const response = await fetch(url)
  const blob = await response.blob()
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
  const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.width, height: image.height })
    image.onerror = reject
    image.src = dataUrl
  })
  const format = dataUrl.includes('image/png') ? 'PNG' : 'JPEG'
  return { data: dataUrl, ...dims, format }
}

function drawLineItem(doc: jsPDF, line: InvoiceLineItem, y: number): number {
  const desc =
    asTrimmedString(line.description) ||
    asTrimmedString(line.sku) ||
    'Ítem'
  const qty = String(line.quantity ?? 0)
  const unit = formatAmount(parseMoney(line.unitPrice))
  const total = formatAmount(parseMoney(line.total))

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FONT_SM)
  y = drawWrapped(doc, desc, MARGIN, y, COL_DESC_W, FONT_SM)

  doc.setFontSize(FONT_XS)
  doc.setTextColor(60)
  doc.text(`${qty} x ${unit}`, MARGIN + 1, y)
  doc.setTextColor(0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(FONT_SM)
  doc.text(total, COL_TOTAL, y, { align: 'right' })
  doc.setFont('helvetica', 'normal')

  return y + LINE_H + GAP_SM
}

function drawMoneyRow(
  doc: jsPDF,
  label: string,
  amount: string,
  y: number,
  bold = false,
): number {
  doc.setFont('helvetica', bold ? 'bold' : 'normal')
  doc.setFontSize(bold ? FONT_MD : FONT_SM)
  doc.text(label, MARGIN, y)
  doc.text(amount, COL_TOTAL, y, { align: 'right' })
  return y + LINE_H + (bold ? GAP_SM : 0)
}

function countUnits(lineItems: InvoiceLineItem[]): number {
  return lineItems.reduce((sum, line) => {
    const q = Number(line.quantity)
    return sum + (Number.isFinite(q) ? q : 0)
  }, 0)
}

export async function generateBoletaThermalPdf(
  boleta: BoletaDetail,
  org: OrganizationSettings,
): Promise<jsPDF> {
  const settings = organizationSettingsWithLogo(org)
  const totals = resolveTotals(boleta)
  const displayName =
    asTrimmedString(settings.tradeName) ||
    asTrimmedString(settings.legalName) ||
    'Comercio'
  const legalName = asTrimmedString(settings.legalName)
  const orgTaxId = asTrimmedString(settings.rut)
  const giro = asTrimmedString(settings.giro)
  const addressLine = formatAddressLine(settings)
  const phone = asTrimmedString(settings.phone)
  const email = asTrimmedString(settings.email)
  const buyerLabel = boletaBuyerDisplayName(boleta)
  const owner = asTrimmedString(boleta.owner)
  const timeLabel = formatReceiptTime(boleta)
  const itemCount = totals.lineItems.length
  const unitCount = countUnits(totals.lineItems)

  const probe = new jsPDF({ unit: 'mm', format: [WIDTH_MM, 200] })
  const heightMm = estimateHeightMm(probe, boleta, displayName)

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [WIDTH_MM, heightMm],
  })

  let y = MARGIN
  const centerX = WIDTH_MM / 2
  const w = contentWidth()

  y = await tryAddLogo(doc, resolveOrganizationLogoUrl(settings.logoUrl), y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(FONT_LG)
  y = drawWrapped(doc, displayName, MARGIN, y, w, FONT_LG, { align: 'center' })

  if (legalName && legalName.toLowerCase() !== displayName.toLowerCase()) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(FONT_XS)
    y = drawWrapped(doc, legalName, MARGIN, y, w, FONT_XS, { align: 'center' })
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FONT_SM)

  if (orgTaxId) {
    doc.text(`RUT: ${orgTaxId}`, centerX, y, { align: 'center' })
    y += LINE_H
  }

  if (giro) {
    doc.setFontSize(FONT_XS)
    y = drawWrapped(doc, giro, MARGIN, y, w, FONT_XS, { align: 'center' })
    doc.setFontSize(FONT_SM)
  }

  if (addressLine) {
    y = drawWrapped(doc, addressLine, MARGIN, y, w, FONT_XS, { align: 'center' })
  }

  if (phone) {
    doc.setFontSize(FONT_XS)
    doc.text(`Tel: ${phone}`, centerX, y, { align: 'center' })
    y += LINE_H
  }

  if (email) {
    doc.setFontSize(FONT_XS)
    y = drawWrapped(doc, email, MARGIN, y, w, FONT_XS, { align: 'center' })
  }

  y += GAP_SM
  y = drawRule(doc, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(FONT_MD)
  doc.text('COMPROBANTE DE VENTA', centerX, y, { align: 'center' })
  y += LINE_H + GAP_SM

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FONT_SM)
  doc.text(`Nº ${asTrimmedString(boleta.number)}`, MARGIN, y)
  y += LINE_H
  doc.text(`Fecha: ${asTrimmedString(boleta.issueDate)}`, MARGIN, y)
  y += LINE_H
  doc.text(`Hora: ${timeLabel}`, MARGIN, y)
  y += LINE_H

  if (owner) {
    doc.text(`Atendido por: ${owner}`, MARGIN, y)
    y += LINE_H
  }

  if (buyerLabel && buyerLabel !== 'Sin comprador') {
    y += GAP_SM
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(FONT_SM)
    doc.text('Cliente', MARGIN, y)
    y += LINE_H
    doc.setFont('helvetica', 'normal')
    y = drawWrapped(doc, buyerLabel, MARGIN, y, w, FONT_SM)
    if (hasText(boleta.buyerTaxId)) {
      doc.text(`RUT: ${asTrimmedString(boleta.buyerTaxId)}`, MARGIN, y)
      y += LINE_H
    }
  }

  y += GAP_SM
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(FONT_XS)
  doc.text('DETALLE', MARGIN, y)
  y += LINE_H
  y = drawRule(doc, y, true)
  doc.setFont('helvetica', 'normal')

  for (const line of totals.lineItems) {
    y = drawLineItem(doc, line, y)
  }

  y = drawRule(doc, y)

  const subtotal = formatAmount(parseMoney(totals.subtotal))
  const tax = formatAmount(parseMoney(totals.taxAmount))
  const total = formatAmount(parseMoney(totals.amount))
  const discount = totals.globalDiscount
  const taxLabel = hasText(totals.taxPercent)
    ? `IVA (${asTrimmedString(totals.taxPercent).replace(/%/g, '')}%)`
    : 'IVA'

  doc.setFontSize(FONT_SM)
  y = drawMoneyRow(doc, 'Subtotal', subtotal, y)
  if (discount > 0) {
    y = drawMoneyRow(
      doc,
      `Descuento (${discount}%)`,
      asTrimmedString(totals.discountAmount) || `−${formatAmount(0)}`,
      y,
    )
  }
  y = drawMoneyRow(doc, taxLabel, tax, y)
  y = drawMoneyRow(doc, 'TOTAL', total, y, true)

  y += GAP_SM
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FONT_SM)
  doc.text(`Medio de pago: ${asTrimmedString(boleta.paymentMethod) || '—'}`, MARGIN, y)
  y += LINE_H

  const qtyLabel =
    itemCount === 1
      ? `Ítems: 1 (${unitCount} ud.)`
      : `Ítems: ${itemCount} (${unitCount} ud.)`
  doc.setFontSize(FONT_XS)
  doc.setTextColor(70)
  doc.text(qtyLabel, MARGIN, y)
  y += LINE_H + GAP_MD

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(FONT_SM)
  doc.setTextColor(0)
  doc.text('¡Gracias por su compra!', centerX, y, { align: 'center' })
  y += LINE_H + GAP_SM

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FONT_XS)
  doc.setTextColor(100)
  y = drawWrapped(
    doc,
    'Comprobante de venta interno — no válido como documento tributario electrónico (boleta/factura SII).',
    MARGIN,
    y,
    w,
    FONT_XS,
    { align: 'center' },
  )
  doc.setTextColor(0)

  return doc
}

export function downloadBoletaThermalPdf(
  boleta: BoletaDetail,
  doc: jsPDF,
): void {
  const number = asTrimmedString(boleta.number) || 'boleta'
  doc.save(`${number.replace(/\s+/g, '_')}_comprobante.pdf`)
}

export function printBoletaThermalPdf(doc: jsPDF): boolean {
  const blob = doc.output('blob') as Blob
  const url = URL.createObjectURL(blob)
  const printWindow = window.open(url, '_blank', 'noopener,noreferrer')
  if (!printWindow) {
    URL.revokeObjectURL(url)
    return false
  }
  printWindow.addEventListener('load', () => {
    printWindow.focus()
    printWindow.print()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  })
  return true
}

export async function downloadAndPrintBoletaThermalPdf(
  boleta: BoletaDetail,
  org: OrganizationSettings,
): Promise<{ downloaded: boolean; printed: boolean }> {
  const doc = await generateBoletaThermalPdf(boleta, org)
  downloadBoletaThermalPdf(boleta, doc)
  const printed = printBoletaThermalPdf(doc)
  return { downloaded: true, printed }
}
