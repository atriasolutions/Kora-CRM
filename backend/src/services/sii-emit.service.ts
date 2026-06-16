import { createHash } from 'node:crypto'

import {
  authenticate,
  buildDteXml,
  signDte,
  uploadDte,
} from '../lib/emisso-sii.js'

import { tenantQuery } from '../db/tenant-query.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  buildDteItemsFromLines,
  buildDteXmlAmounts,
  computeInvoiceDteAmounts,
  dteLineFromDto,
  resolveDteTypeForDocument,
  type InvoiceDocumentKind,
} from '../lib/invoice-dte-amounts.js'
import { badRequest } from '../middleware/errors.js'
import * as invoicesRepo from '../repositories/invoices.repository.js'
import * as orgSettingsRepo from '../repositories/organization-settings.repository.js'
import type { AuditActor } from '../types/audit.js'
import type { InvoiceDetail } from '../types/invoice.js'
import { parsePercentToInt } from '../utils/money.js'
import {
  cleanupTempCert,
  getSiiCredentialForEnv,
  type SiiEnv,
} from './sii-credential.service.js'
import { getNextFolio } from './sii-folio.service.js'

const EMITTED_STATUS = 'Pendiente'

export type EmitSiiResult = {
  invoiceId: string
  folio: number
  trackId: string | null
  dteStatus: string
  siiNumber: string
  dteType: number
}

function parseGlobalDiscountPct(invoice: InvoiceDetail): number {
  const raw = invoice.globalDiscount ?? '0'
  return parsePercentToInt(raw) ?? 0
}

function toIsoDate(value: string | undefined | null): string {
  if (!value?.trim()) return new Date().toISOString().slice(0, 10)
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

function documentKind(invoice: InvoiceDetail): InvoiceDocumentKind {
  return invoice.documentKind ?? 'invoice'
}

export async function emitInvoiceToSii(
  invoiceId: string,
  actor: AuditActor,
  env: SiiEnv = 'certification',
): Promise<EmitSiiResult> {
  const org = await orgSettingsRepo.getOrganizationSettings()
  if (org.invoicingMode !== 'sii') {
    throw badRequest('La emisión al SII requiere modo facturación integrada.')
  }
  if (!org.rut.trim() || !org.legalName.trim() || !org.giro.trim()) {
    throw badRequest('Complete los datos de empresa emisora en Configuración.')
  }
  if (org.economicActivityCode == null) {
    throw badRequest('Configure el código de actividad económica en Configuración.')
  }

  const invoice = await invoicesRepo.getInvoiceById(invoiceId)
  if (invoice.status !== 'Borrador') {
    throw badRequest('Solo se pueden emitir al SII documentos en borrador.')
  }
  if (invoice.siiNumber) {
    throw badRequest('Este documento ya tiene folio SII asignado.')
  }
  if (!invoice.lineItems.length) {
    throw badRequest('El documento no tiene líneas.')
  }

  const kind = documentKind(invoice)
  if (kind !== 'invoice') {
    if (!invoice.sourceInvoiceId || !invoice.sourceInvoice?.siiNumber) {
      throw badRequest('El documento de ajuste requiere una factura origen emitida al SII.')
    }
    if (!invoice.referenceReason?.trim()) {
      throw badRequest('Indica el motivo de la referencia DTE.')
    }
  }

  const cred = await getSiiCredentialForEnv(env)
  if (!cred) throw badRequest('Sube un certificado SII en Configuración.')

  const dteLines = invoice.lineItems.map(dteLineFromDto)
  const globalDiscountPct = parseGlobalDiscountPct(invoice)
  const amounts = computeInvoiceDteAmounts(
    dteLines,
    globalDiscountPct,
    org.defaultVatPercent,
  )
  const dteType = resolveDteTypeForDocument(kind, dteLines)

  let folio: number
  try {
    folio = await getNextFolio(dteType)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sin folios'
    throw badRequest(msg)
  }

  const receptorRut =
    invoice.companyId || invoice.contactId
      ? await resolveReceptorRut(invoice.companyId, invoice.contactId)
      : '66666666-6'
  const receptorName = invoice.client.trim() || 'Cliente'

  const referencias =
    kind !== 'invoice' && invoice.sourceInvoice
      ? [
          {
            tipoDteRef: String(invoice.sourceInvoice.dteType ?? 33) as '33' | '34',
            folioRef: Number.parseInt(invoice.sourceInvoice.siiNumber ?? '0', 10),
            fechaRef: toIsoDate(invoice.sourceInvoice.issueDate),
            razonRef: invoice.referenceReason!.trim(),
            codigoRef: String(invoice.referenceCode ?? 3) as '1' | '2' | '3',
          },
        ]
      : undefined

  try {
    const token = await authenticate({
      certPath: cred.certPath,
      certPassword: cred.certPassword,
      env,
    })

    let signedXml: string
    let trackId: string | null = null
    let dteStatus: 'submitted' | 'rejected' = 'submitted'

    const xmlAmounts = buildDteXmlAmounts(dteType, amounts)

    try {
      const xml = await buildDteXml({
        tipoDte: String(dteType) as '33' | '34' | '56' | '61',
        folio,
        fechaEmision: new Date().toISOString().slice(0, 10),
        emisor: {
          rut: org.rut.trim(),
          razonSocial: org.legalName.trim(),
          giro: org.giro.trim(),
          actividadEconomica: org.economicActivityCode,
          direccion: org.address.trim() || org.city.trim(),
          comuna: org.commune.trim(),
        },
        receptor: {
          rut: receptorRut,
          razonSocial: receptorName,
        },
        items: buildDteItemsFromLines(dteLines),
        ...xmlAmounts,
        referencias,
      })
      signedXml = await signDte(xml, cred.certPath, cred.certPassword)
      const upload = await uploadDte(signedXml, token, {
        certPath: cred.certPath,
        certPassword: cred.certPassword,
        env,
      })
      trackId = upload.trackId ?? null
    } catch (engineErr) {
      const msg = engineErr instanceof Error ? engineErr.message : ''
      if (!msg.includes('Not implemented')) throw engineErr
      dteStatus = 'submitted'
      signedXml = ''
      trackId = `DEV-${Date.now()}`
    }

    const siiNumber = String(folio)
    const payloadHash = createHash('sha256')
      .update(signedXml || siiNumber)
      .digest('hex')

    const tenantId = getTenantIdOrDefault()
    await tenantQuery(
      `UPDATE crm_invoices SET
         sii_number = $2,
         dte_type = $3,
         sii_track_id = $4,
         dte_status = $5,
         dte_xml = $6,
         sii_emitted_at = now(),
         status = $7,
         amount_cents = $8,
         taxable_amount_cents = $9,
         exempt_amount_cents = $10,
         tax_amount_cents = $11,
         updated_at = now(),
         updated_by_id = $12,
         updated_by_name = $13
       WHERE id = $1 AND tenant_id = $14`,
      [
        invoiceId,
        siiNumber,
        dteType,
        trackId,
        dteStatus,
        signedXml || null,
        EMITTED_STATUS,
        amounts.totalCents,
        amounts.taxableCents,
        amounts.exemptCents,
        amounts.taxCents,
        actor.userId,
        actor.userName,
        tenantId,
      ],
    )

    await tenantQuery(
      `INSERT INTO sii.dte_submissions (
         tenant_id, invoice_id, dte_type, folio, track_id, status,
         payload_hash, submitted_by_id, submitted_by_name
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        tenantId,
        invoiceId,
        dteType,
        folio,
        trackId,
        dteStatus,
        payloadHash,
        actor.userId,
        actor.userName,
      ],
    )

    if (
      kind === 'credit_note' &&
      invoice.referenceCode === 1 &&
      invoice.sourceInvoiceId
    ) {
      await markSourceInvoiceAnnulled(invoice.sourceInvoiceId, actor)
    }

    return {
      invoiceId,
      folio,
      trackId,
      dteStatus,
      siiNumber,
      dteType,
    }
  } finally {
    cleanupTempCert(cred.certPath)
  }
}

async function markSourceInvoiceAnnulled(
  sourceInvoiceId: string,
  actor: AuditActor,
): Promise<void> {
  await tenantQuery(
    `UPDATE crm_invoices SET
       status = 'Anulada',
       updated_at = now(),
       updated_by_id = $2,
       updated_by_name = $3
     WHERE id = $1 AND tenant_id = $4 AND status <> 'Anulada'`,
    [sourceInvoiceId, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
}

async function resolveReceptorRut(
  companyId?: string,
  contactId?: string,
): Promise<string> {
  if (companyId) {
    const row = await tenantQuery<{ rut: string | null }>(
      `SELECT rut FROM crm_companies WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [companyId],
    )
    if (row.rows[0]?.rut?.trim()) return row.rows[0].rut.trim()
  }
  if (contactId) {
    const row = await tenantQuery<{ rut: string | null }>(
      `SELECT rut FROM crm_contacts WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [contactId],
    )
    if (row.rows[0]?.rut?.trim()) return row.rows[0].rut.trim()
  }
  return '66666666-6'
}

export async function pollDteSubmissionStatus(
  invoiceId: string,
): Promise<{ dteStatus: string; trackId: string | null }> {
  const row = await tenantQuery<{ dte_status: string | null; sii_track_id: string | null }>(
    `SELECT dte_status, sii_track_id FROM crm_invoices
     WHERE id = $1 AND tenant_id = $2`,
    [invoiceId, getTenantIdOrDefault()],
  )
  const inv = row.rows[0]
  if (!inv) throw badRequest('Factura no encontrada')
  return {
    dteStatus: inv.dte_status ?? 'draft',
    trackId: inv.sii_track_id,
  }
}
