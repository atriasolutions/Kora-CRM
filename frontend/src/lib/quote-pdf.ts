import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import type { BankAccount } from '@/api/bank-accounts'
import type { CompanyListItem } from '@/data/companies.mock'
import type { QuoteDetail, QuoteLineItem } from '@/data/quote-detail.mock'
import { amountInWordsSpanish } from '@/lib/amount-in-words-es'
import type { CompanyAddressRecord } from '@/lib/company-location'
import { drawDocumentPdfBlueBox } from '@/lib/document-pdf-blue-box'
import { formatOrganizationLocation } from '@/lib/organization-location'
import {
  resolveQuoteCustomerPdfFields,
  type QuoteCustomerPdfFields,
} from '@/lib/quote-customer-pdf'
import { resolveOrganizationLogoUrl } from '@/lib/organization-logo'
import { quoteLineSubjectToVat } from '@/lib/quote-line-item'
import type { OrganizationSettings } from '@/types/organization-settings'

const TEXT: [number, number, number] = [15, 23, 42]
const MARGIN = 14
/** Zona inferior reservada para el pie «Documento generado por Kora CRM…» */
const PAGE_FOOTER_RESERVE = 24
const PAGE_TOP = 14

type AutoTableDoc = jsPDF & { lastAutoTable?: { finalY: number } }

function pdfText(value: string | undefined | null, fallback = '—'): string {
  const trimmed = value?.trim()
  return trimmed || fallback
}

function parseMoney(value: string): number {
  return Number.parseInt(value.replace(/[^\d]/g, ''), 10) || 0
}

function formatAmount(value: number): string {
  return value.toLocaleString('es-CL')
}

function parseDiscountPercent(discount: string): number {
  const n = Number.parseInt(discount.replace(/[^\d]/g, ''), 10)
  return Number.isNaN(n) ? 0 : n
}

function pageHeight(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight()
}

function pageWidth(doc: jsPDF): number {
  return doc.internal.pageSize.getWidth()
}

function tableFinalY(doc: jsPDF, fallbackY: number): number {
  return (doc as AutoTableDoc).lastAutoTable?.finalY ?? fallbackY
}

function maxContentY(doc: jsPDF): number {
  return pageHeight(doc) - PAGE_FOOTER_RESERVE
}

function ensurePageSpace(doc: jsPDF, y: number, neededMm: number): number {
  if (y + neededMm > maxContentY(doc)) {
    doc.addPage()
    return PAGE_TOP
  }
  return y
}

function collectPdfTermLines(quote: QuoteDetail): string[] {
  const lines: string[] = []
  const payment = quote.paymentTerms?.trim()
  const delivery = quote.deliveryTerms?.trim()
  const termsText = quote.terms?.trim()
  if (payment) lines.push(`Pago: ${payment}`)
  if (delivery) lines.push(`Entrega: ${delivery}`)
  if (termsText) lines.push(termsText)
  return lines
}


function stampAllPageFooters(doc: jsPDF, margin: number): void {
  const total = doc.getNumberOfPages()
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page)
    const pageH = pageHeight(doc)
    const pageW = pageWidth(doc)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    const footerY = pageH - 12
    doc.text(
      'Documento generado por Kora CRM. Validez y condiciones según lo indicado en esta cotización.',
      margin,
      footerY,
    )
    if (total > 1) {
      doc.text(`Página ${page} de ${total}`, pageW - margin, footerY, { align: 'right' })
    }
  }
}

function logoFormat(logoUrl: string): 'PNG' | 'JPEG' | 'WEBP' | null {
  const lower = logoUrl.toLowerCase()
  if (logoUrl.startsWith('data:image/png') || lower.includes('.png')) return 'PNG'
  if (
    logoUrl.startsWith('data:image/jpeg') ||
    logoUrl.startsWith('data:image/jpg') ||
    lower.includes('.jpg') ||
    lower.includes('.jpeg')
  ) {
    return 'JPEG'
  }
  if (logoUrl.startsWith('data:image/webp') || lower.includes('.webp')) return 'WEBP'
  return null
}

function drawWrappedValue(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
): number {
  const lines = doc.splitTextToSize(text || '—', maxWidth)
  doc.text(lines, x, y)
  return Math.max(5.5, lines.length * 3.8)
}

function drawCustomerBlock(
  doc: jsPDF,
  customer: QuoteCustomerPdfFields,
  margin: number,
  pageW: number,
  startY: number,
): number {
  let y = startY
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Cliente', margin, y)
  y += 6

  const colMid = pageW / 2
  const leftValueMaxW = colMid - margin - 32
  const rightValueMaxW = pageW - margin - colMid - 26
  doc.setFontSize(8)

  const leftRows: [string, string][] = [
    ['EMPRESA:', customer.companyName],
    ['DIRECCIÓN:', customer.address],
    ['COMUNA:', customer.commune],
    ['INDUSTRIA:', customer.industry],
  ]
  const rightRows: [string, string][] = [
    ['R.U.T.:', customer.rut],
    ['REGIÓN:', customer.region],
    ['CONTACTO:', customer.contact],
  ]

  const rowCount = Math.max(leftRows.length, rightRows.length)
  for (let i = 0; i < rowCount; i++) {
    let rowHeight = 5.5
    const left = leftRows[i]
    const right = rightRows[i]

    if (left) {
      doc.setFont('helvetica', 'bold')
      doc.text(left[0], margin, y)
      doc.setFont('helvetica', 'normal')
      rowHeight = Math.max(
        rowHeight,
        drawWrappedValue(doc, left[1], margin + 26, y, leftValueMaxW),
      )
    }
    if (right) {
      doc.setFont('helvetica', 'bold')
      doc.text(right[0], colMid, y)
      doc.setFont('helvetica', 'normal')
      rowHeight = Math.max(
        rowHeight,
        drawWrappedValue(doc, right[1], colMid + 24, y, rightValueMaxW),
      )
    }
    y += rowHeight
  }

  return y + 4
}

function addLogo(doc: jsPDF, logoUrl: string, x: number, y: number, maxW: number, maxH: number) {
  if (!logoUrl?.trim()) return
  try {
    const fmt = logoFormat(logoUrl)
    if (!fmt) return
    const props = doc.getImageProperties(logoUrl)
    const ratio = props.width / props.height
    let width = maxW
    let height = width / ratio
    if (height > maxH) {
      height = maxH
      width = height * ratio
    }
    doc.addImage(logoUrl, fmt, x, y, width, height, undefined, 'FAST')
  } catch {
    /* ignore */
  }
}

function lineHasDiscount(li: QuoteLineItem): boolean {
  return parseDiscountPercent(li.discount) > 0
}

function buildQuoteLineTable(lineItems: QuoteLineItem[]) {
  const showDiscountCol = lineItems.some(lineHasDiscount)
  const showDeferredCol = lineItems.some((li) => li.deferredPayment === true)

  const head = ['SKU', 'Descripción', 'Cant.', 'P. unit.']
  if (showDiscountCol) head.push('Desc.')
  if (showDeferredCol) head.push('Plazo entrega')
  head.push('Total')

  const body =
    lineItems.length > 0
      ? lineItems.map((li) => {
          const row: string[] = [
            pdfText(li.sku, ''),
            pdfText(li.description, 'Ítem'),
            String(li.quantity ?? 1),
            pdfText(li.unitPrice, '$0'),
          ]
          if (showDiscountCol) row.push(pdfText(li.discount, '0%'))
          if (showDeferredCol) {
            row.push(
              li.deferredPayment
                ? pdfText(li.deferredPaymentText, '—')
                : '—',
            )
          }
          row.push(pdfText(li.total, '$0'))
          return row
        })
      : [['—', 'Sin líneas de detalle', '—', '—', ...(showDiscountCol ? ['—'] : []), ...(showDeferredCol ? ['—'] : []), '—']]

  return { head: [head], body, showDiscountCol, showDeferredCol }
}

function buildLineTableColumnStyles(
  pageW: number,
  margin: number,
  showDiscountCol: boolean,
  showDeferredCol: boolean,
): Record<number, { cellWidth: number; halign?: 'left' | 'center' | 'right'; overflow?: 'linebreak' }> {
  const tableWidth = pageW - margin * 2
  const skuW = 17
  const qtyW = 11
  const unitW = 22
  const discountW = showDiscountCol ? 13 : 0
  const deferredW = showDeferredCol ? 26 : 0
  const totalW = 24
  const descW = Math.max(
    42,
    tableWidth - skuW - qtyW - unitW - discountW - deferredW - totalW,
  )

  const styles: Record<number, { cellWidth: number; halign?: 'left' | 'center' | 'right'; overflow?: 'linebreak' }> = {
    0: { cellWidth: skuW, overflow: 'linebreak' },
    1: { cellWidth: descW, overflow: 'linebreak' },
    2: { cellWidth: qtyW, halign: 'center' },
    3: { cellWidth: unitW, halign: 'right', overflow: 'linebreak' },
  }

  let col = 4
  if (showDiscountCol) {
    styles[col] = { cellWidth: discountW, halign: 'center' }
    col += 1
  }
  if (showDeferredCol) {
    styles[col] = { cellWidth: deferredW, overflow: 'linebreak' }
    col += 1
  }
  styles[col] = { cellWidth: totalW, halign: 'right' }

  return styles
}

function drawBankDetailsBlock(
  doc: jsPDF,
  account: BankAccount,
  margin: number,
  pageW: number,
  startY: number,
): number {
  const rows = [
    `Cuenta: ${account.accountName}`,
    ...(account.rut?.trim() ? [`RUT: ${account.rut.trim()}`] : []),
    `Banco: ${account.bankName}`,
    `Tipo: ${account.accountType}`,
    `Número: ${account.accountNumber}`,
    ...(account.email?.trim() ? [`Correo: ${account.email.trim()}`] : []),
  ]
  let blockHeight = 9
  doc.setFontSize(8)
  for (const line of rows) {
    blockHeight += doc.splitTextToSize(line, pageW - margin * 2).length * 3.8 + 1
  }
  blockHeight += 4

  let y = ensurePageSpace(doc, startY, blockHeight)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...TEXT)
  doc.text('Datos para transferencia', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  for (const line of rows) {
    const wrapped = doc.splitTextToSize(line, pageW - margin * 2)
    const lineHeight = wrapped.length * 3.8 + 1
    y = ensurePageSpace(doc, y, lineHeight)
    doc.text(wrapped, margin, y)
    y += lineHeight
  }
  return y + 4
}

export type QuotePdfInput = {
  quote: QuoteDetail
  organization: OrganizationSettings
  customerCompany?: CompanyListItem
  customerHeadquarters?: CompanyAddressRecord
  bankAccount?: BankAccount
}

export function buildQuotePdf(
  doc: jsPDF,
  quote: QuoteDetail,
  organization: OrganizationSettings,
  customerCompany?: CompanyListItem,
  customerHeadquarters?: CompanyAddressRecord,
  bankAccount?: BankAccount,
): void {
  const customer = resolveQuoteCustomerPdfFields(
    quote,
    customerCompany,
    customerHeadquarters,
  )
  const pageW = pageWidth(doc)
  const margin = MARGIN
  let y = PAGE_TOP

  addLogo(doc, resolveOrganizationLogoUrl(organization.logoUrl), margin, y, 40, 22)
  const issuerX = margin + 44

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...TEXT)
  doc.text(pdfText(organization.legalName, 'Empresa'), issuerX, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const issuerLines = [
    organization.tradeName,
    `RUT: ${organization.rut}`,
    organization.giro,
    organization.address,
    `${formatOrganizationLocation(organization)} · ${organization.phone}`,
    organization.email,
  ].filter(Boolean)
  let lineY = y + 9
  for (const line of issuerLines) {
    doc.text(line, issuerX, lineY)
    lineY += 3.8
  }

  const boxW = 54
  const boxH = 28
  const boxX = pageW - margin - boxW
  drawDocumentPdfBlueBox(
    doc,
    boxX,
    y,
    boxW,
    boxH,
    pdfText(organization.rut, '—'),
    'COTIZACIÓN',
    quote.code,
  )

  y = Math.max(lineY, y + boxH) + 6
  doc.setTextColor(...TEXT)
  doc.setFontSize(9)
  doc.text(`Fecha: ${pdfText(quote.issueDate)}`, margin, y)
  doc.text(`Válida hasta: ${pdfText(quote.validUntil)}`, margin + 70, y)
  doc.text(`Versión ${pdfText(quote.version, 'v1')}`, pageW - margin - 52, y)
  y += 8

  y = drawCustomerBlock(doc, customer, margin, pageW, y)

  const lineTable = buildQuoteLineTable(quote.lineItems ?? [])
  autoTable(doc, {
    startY: y,
    head: lineTable.head,
    body: lineTable.body,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'top',
      textColor: TEXT,
    },
    headStyles: {
      fillColor: [229, 231, 235],
      textColor: TEXT,
      fontStyle: 'bold',
      valign: 'middle',
      overflow: 'linebreak',
    },
    columnStyles: buildLineTableColumnStyles(
      pageW,
      margin,
      lineTable.showDiscountCol,
      lineTable.showDeferredCol,
    ),
    margin: { left: margin, right: margin, bottom: PAGE_FOOTER_RESERVE },
    showHead: 'everyPage',
    rowPageBreak: 'auto',
  })

  y = tableFinalY(doc, y + 20) + 6

  const subtotal = parseMoney(quote.subtotal ?? '$0')
  const discount = parseMoney(quote.discountAmount ?? '$0')
  const net = Math.max(0, subtotal - discount)
  const vat = parseMoney(quote.taxAmount ?? '$0')
  const total = parseMoney(quote.amount ?? '$0')

  const hasMixedVat = (quote.lineItems ?? []).some(
    (li) => quoteLineSubjectToVat(li),
  ) && (quote.lineItems ?? []).some((li) => !quoteLineSubjectToVat(li))

  const totalsBody: string[][] = [['Subtotal', `$ ${formatAmount(subtotal)}`]]
  if (hasMixedVat) {
    totalsBody.push(
      ['Neto afecto', `$ ${formatAmount(parseMoney(quote.taxableSubtotal ?? quote.subtotal ?? '$0'))}`],
      ['Neto exento', `$ ${formatAmount(parseMoney(quote.exemptSubtotal ?? '$0'))}`],
    )
  }
  if (discount > 0) {
    totalsBody.push(['Descuento', `$ ${formatAmount(discount)}`])
  }
  totalsBody.push(
    ['Neto', `$ ${formatAmount(net)}`],
    [pdfText(quote.taxPercent, 'IVA'), `$ ${formatAmount(vat)}`],
    ['TOTAL CLP', `$ ${formatAmount(total)}`],
  )

  const totalsX = pageW - margin - 58
  const totalsTableHeight = totalsBody.length * 7 + 4
  y = ensurePageSpace(doc, y, totalsTableHeight)
  autoTable(doc, {
    startY: y,
    margin: { left: totalsX, right: margin, bottom: PAGE_FOOTER_RESERVE },
    tableWidth: 58,
    body: totalsBody,
    styles: { fontSize: 8, textColor: TEXT },
    theme: 'grid',
  })

  y = tableFinalY(doc, y + 24) + 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...TEXT)
  const amountWords = doc.splitTextToSize(`SON: ${amountInWordsSpanish(total)}`, pageW - margin * 2)
  y = ensurePageSpace(doc, y, amountWords.length * 3.8 + 6)
  doc.text(amountWords, margin, y)
  y += amountWords.length * 3.8 + 6

  const pdfTermLines = collectPdfTermLines(quote)

  if (pdfTermLines.length > 0) {
    y = ensurePageSpace(doc, y, 12)
    doc.setFont('helvetica', 'bold')
    doc.text('Términos', margin, y)
    y += 4
    doc.setFont('helvetica', 'normal')
    for (const t of pdfTermLines) {
      const lines = doc.splitTextToSize(t, pageW - margin * 2)
      y = ensurePageSpace(doc, y, lines.length * 3.8 + 4)
      doc.text(lines, margin, y)
      y += lines.length * 3.8 + 2
    }
    y += 4
  }

  if (quote.includeBankDetails && bankAccount) {
    y = drawBankDetailsBlock(doc, bankAccount, margin, pageW, y)
  }

  stampAllPageFooters(doc, margin)
}

export function generateQuotePdf(input: QuotePdfInput): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  buildQuotePdf(
    doc,
    input.quote,
    input.organization,
    input.customerCompany,
    input.customerHeadquarters,
    input.bankAccount,
  )
  return doc.output('blob')
}

export function downloadQuotePdf(
  input: QuotePdfInput,
  filename?: string,
) {
  const blob = generateQuotePdf(input)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename ?? `${input.quote.code.replace(/\s+/g, '_')}.pdf`
  anchor.click()
  URL.revokeObjectURL(url)
}
