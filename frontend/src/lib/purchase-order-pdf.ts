import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import type { CompanyListItem } from '@/data/companies.mock'
import type { PurchaseDetail } from '@/data/purchase-detail.mock'
import type { CompanyAddressRecord } from '@/lib/company-location'
import { amountInWordsSpanish } from '@/lib/amount-in-words-es'
import {
  formatDeliveryLocation,
  resolveSupplierPdfFields,
} from '@/lib/purchase-order-supplier-pdf'
import { purchaseLineUnitShort } from '@/lib/purchase-line-units'
import { drawDocumentPdfBlueBox } from '@/lib/document-pdf-blue-box'
import { formatOrganizationLocation } from '@/lib/organization-location'
import { resolveOrganizationLogoUrl } from '@/lib/organization-logo'
import type { OrganizationSettings } from '@/types/organization-settings'

const RED: [number, number, number] = [185, 28, 28]
const GRAY_HEADER: [number, number, number] = [229, 231, 235]
const TEXT: [number, number, number] = [15, 23, 42]

function parseMoney(value: string): number {
  return Number.parseInt(value.replace(/[^\d]/g, ''), 10) || 0
}

/** Formato numérico estilo OC chilena (sin símbolo $). */
export function formatOcAmount(value: number): string {
  return value.toLocaleString('es-CL')
}

function formatOcDate(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return '—'
  const iso = /^\d{4}-\d{2}-\d{2}$/.exec(trimmed)
  if (iso) {
    const d = new Date(`${trimmed}T12:00:00`)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    }
  }
  return trimmed
}

function orderNumberFromReference(reference: string): string {
  const digits = reference.replace(/[^\d]/g, '')
  return digits || reference
}

function lineDiscountAmount(line: PurchaseDetail['lineItems'][0]): number {
  const pct = Number.parseFloat(line.discount.replace('%', '')) || 0
  const gross = parseMoney(line.unitPrice) * line.quantity
  return Math.round(gross * (pct / 100))
}

export type PurchaseOrderPdfTotals = {
  discount: number
  surcharge: number
  exempt: number
  taxable: number
  vat: number
  total: number
}

export function computePurchaseOrderTotals(
  purchase: PurchaseDetail,
  vatPercent: number,
): PurchaseOrderPdfTotals {
  let discount = 0
  let taxable = 0

  for (const line of purchase.lineItems) {
    const lineDisc = lineDiscountAmount(line)
    discount += lineDisc
    taxable += parseMoney(line.total)
  }

  if (taxable === 0) {
    taxable = purchase.amountNum || parseMoney(purchase.amount)
  }

  const vat = Math.round(taxable * (vatPercent / 100))
  const total = taxable + vat

  return {
    discount,
    surcharge: 0,
    exempt: 0,
    taxable,
    vat,
    total,
  }
}

function logoImageFormat(logoUrl: string): 'PNG' | 'JPEG' | 'WEBP' | null {
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

/** Escala la imagen dentro de maxW×maxH (mm) manteniendo proporción. */
function fitLogoDimensions(
  naturalW: number,
  naturalH: number,
  maxW: number,
  maxH: number,
): { width: number; height: number } {
  if (naturalW <= 0 || naturalH <= 0) return { width: maxW, height: maxH }
  const ratio = naturalW / naturalH
  let width = maxW
  let height = width / ratio
  if (height > maxH) {
    height = maxH
    width = height * ratio
  }
  return { width, height }
}

function addLogo(
  doc: jsPDF,
  logoUrl: string,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
): { width: number; height: number } {
  if (!logoUrl?.trim()) return { width: 0, height: 0 }
  try {
    const fmt = logoImageFormat(logoUrl)
    if (!fmt) return { width: 0, height: 0 }
    const props = doc.getImageProperties(logoUrl)
    const { width, height } = fitLogoDimensions(props.width, props.height, maxW, maxH)
    const offsetY = y + (maxH - height) / 2
    doc.addImage(logoUrl, fmt, x, offsetY, width, height, undefined, 'FAST')
    return { width, height }
  } catch {
    return { width: 0, height: 0 }
  }
}

export type PurchaseOrderPdfInput = {
  purchase: PurchaseDetail
  organization: OrganizationSettings
  supplierCompany?: CompanyListItem
  /** Casa matriz del proveedor (comuna, región, dirección). */
  supplierHeadquarters?: CompanyAddressRecord
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

export function generatePurchaseOrderPdf(input: PurchaseOrderPdfInput): Blob {
  const { purchase, organization, supplierCompany, supplierHeadquarters } = input
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14
  let y = 14

  const totals = computePurchaseOrderTotals(purchase, organization.defaultVatPercent)
  const orderNo = orderNumberFromReference(purchase.reference)

  const boxW = 54
  const boxH = 28
  const boxX = pageW - margin - boxW
  const logoGap = 5
  const logoMaxW = Math.min(52, boxX - margin - logoGap - 8)
  const logo = addLogo(
    doc,
    resolveOrganizationLogoUrl(organization.logoUrl),
    margin,
    y,
    logoMaxW,
    boxH,
  )
  const issuerX = margin + (logo.width > 0 ? logo.width + logoGap : 0)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...RED)
  doc.text(organization.legalName.toUpperCase(), issuerX, y + 4)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...TEXT)
  const issuerLines = [
    organization.tradeName ? organization.tradeName.toUpperCase() : null,
    organization.tagline || null,
    `R.U.T.: ${organization.rut}`,
    `GIRO: ${organization.giro}`,
    organization.address,
    `${formatOrganizationLocation(organization)} · Tel: ${organization.phone}`,
    `E-mail: ${organization.email}`,
  ].filter(Boolean) as string[]

  let issuerY = y + 9
  for (const line of issuerLines) {
    doc.text(line, issuerX, issuerY)
    issuerY += 3.6
  }

  drawDocumentPdfBlueBox(
    doc,
    boxX,
    y,
    boxW,
    boxH,
    organization.rut,
    'ORDEN DE COMPRA',
    orderNo,
  )
  doc.setTextColor(...TEXT)

  y = Math.max(issuerY, y + boxH, y + logo.height) + 4

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Fecha Emision: ${formatOcDate(purchase.orderDate)}`, margin, y)
  doc.text(`Comprador: ${purchase.owner}`, margin + 70, y)
  y += 8

  const deliveryLine = formatDeliveryLocation(purchase)
  if (deliveryLine !== '—') {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('LUGAR DE ENTREGA (bodega):', margin, y)
    doc.setFont('helvetica', 'normal')
    const deliveryLines = doc.splitTextToSize(deliveryLine, pageW - margin * 2 - 42)
    doc.text(deliveryLines, margin + 42, y)
    y += Math.max(6, deliveryLines.length * 3.8) + 3
  }

  doc.setDrawColor(180, 180, 180)
  doc.line(margin, y, pageW - margin, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('PROVEEDOR', margin, y)
  y += 6

  const supplier = resolveSupplierPdfFields(
    purchase,
    supplierCompany,
    supplierHeadquarters,
  )
  const colMid = pageW / 2
  const leftValueMaxW = colMid - margin - 30
  const rightValueMaxW = pageW - margin - colMid - 24

  doc.setFontSize(8)

  const leftRows: [string, string][] = [
    ['SEÑOR(ES):', supplier.name],
    ['DIRECCIÓN:', supplier.street],
    ['COMUNA:', supplier.commune],
    ['GIRO:', supplier.giro],
    ['COND. VENTA:', purchase.paymentTerms || '—'],
  ]
  const rightRows: [string, string][] = [
    ['R.U.T.:', supplier.rut],
    ['REGIÓN:', supplier.region],
    ['CONTACTO:', supplier.contact],
    ['RECEPCIÓN:', formatOcDate(purchase.expectedDelivery)],
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
      rowHeight = Math.max(rowHeight, drawWrappedValue(doc, left[1], margin + 28, y, leftValueMaxW))
    }
    if (right) {
      doc.setFont('helvetica', 'bold')
      doc.text(right[0], colMid, y)
      doc.setFont('helvetica', 'normal')
      rowHeight = Math.max(
        rowHeight,
        drawWrappedValue(doc, right[1], colMid + 22, y, rightValueMaxW),
      )
    }
    y += rowHeight
  }

  y += 4
  doc.line(margin, y, pageW - margin, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('OBSERVACIONES:', margin, y)
  doc.setFont('helvetica', 'normal')
  const obs = purchase.description?.trim() || '—'
  const obsLines = doc.splitTextToSize(obs, pageW - margin * 2 - 28)
  doc.text(obsLines, margin + 28, y)
  y += Math.max(6, obsLines.length * 4) + 3

  const tableBody = purchase.lineItems.map((li) => {
    const disc = lineDiscountAmount(li)
    return [
      li.sku?.trim() || '',
      li.product,
      `${li.quantity} ${purchaseLineUnitShort(li)}`,
      formatOcAmount(parseMoney(li.unitPrice)),
      formatOcAmount(disc),
      formatOcAmount(parseMoney(li.total)),
    ]
  })

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Codigo', 'Descripcion', 'Cantidad', 'Precio', 'Descuento', 'Total']],
    body: tableBody.length > 0 ? tableBody : [['', 'Sin líneas', '', '', '', '']],
    styles: { fontSize: 8, cellPadding: 2, textColor: TEXT },
    headStyles: {
      fillColor: GRAY_HEADER,
      textColor: TEXT,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'right', cellWidth: 24 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 26 },
    },
  })

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20
  y += 8

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Vencimiento de pagos', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')

  autoTable(doc, {
    startY: y,
    margin: { left: margin },
    tableWidth: 90,
    head: [['Fecha', 'Monto', 'Detalle']],
    body: [
      [
        formatOcDate(purchase.expectedDelivery),
        formatOcAmount(totals.total),
        purchase.paymentTerms || 'Pago único',
      ],
    ],
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: GRAY_HEADER, fontStyle: 'bold' },
  })

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 12
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(`SON : ${amountInWordsSpanish(totals.total)}`, margin, y)

  const totalsX = pageW - margin - 58
  const totalsStartY = y - 4

  autoTable(doc, {
    startY: totalsStartY,
    margin: { left: totalsX },
    tableWidth: 58,
    body: [
      ['DESCUENTO', `$ ${formatOcAmount(totals.discount)}`],
      ['RECARGO', `$ ${formatOcAmount(totals.surcharge)}`],
      ['EXENTO', `$ ${formatOcAmount(totals.exempt)}`],
      ['AFECTO', `$ ${formatOcAmount(totals.taxable)}`],
      [`I.V.A. ${organization.defaultVatPercent}%`, `$ ${formatOcAmount(totals.vat)}`],
      ['TOTAL', `$ ${formatOcAmount(totals.total)}`],
    ],
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28 },
      1: { halign: 'right', cellWidth: 30 },
    },
    theme: 'grid',
  })

  return doc.output('blob')
}

export function downloadPurchaseOrderPdf(
  input: PurchaseOrderPdfInput,
  filename?: string,
) {
  const blob = generatePurchaseOrderPdf(input)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename ?? `${input.purchase.reference.replace(/\s+/g, '_')}.pdf`
  anchor.click()
  URL.revokeObjectURL(url)
}
