import {
  createSiiSession,
  listInvoices,
} from '../lib/emisso-sii.js'
import type { IssueType } from '@emisso/sii'

import { tenantQuery } from '../db/tenant-query.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import { badRequest } from '../middleware/errors.js'
import * as orgSettingsRepo from '../repositories/organization-settings.repository.js'
import {
  cleanupTempCert,
  getSiiCredentialForEnv,
  type SiiEnv,
} from './sii-credential.service.js'

export type RcvInvoiceDto = {
  id: string
  issueType: IssueType
  periodYear: number
  periodMonth: number
  dteType: number | null
  folio: number | null
  issuerRut: string | null
  issuerName: string | null
  receiverRut: string | null
  receiverName: string | null
  issueDate: string | null
  netAmount: number | null
  taxAmount: number | null
  totalAmount: number | null
  syncedAt: string
}

function parsePeriod(period: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(period.trim())
  if (!match) throw badRequest('Periodo inválido. Use YYYY-MM.')
  const year = Number.parseInt(match[1]!, 10)
  const month = Number.parseInt(match[2]!, 10)
  if (month < 1 || month > 12) throw badRequest('Mes inválido.')
  return { year, month }
}

export async function syncRcvInvoices(params: {
  period: string
  type: IssueType
  env?: SiiEnv
}): Promise<{ synced: number }> {
  const org = await orgSettingsRepo.getOrganizationSettings()
  if (org.invoicingMode !== 'sii') {
    throw badRequest('La sincronización RCV requiere modo facturación SII.')
  }
  const rut = org.rut.trim()
  if (!rut) throw badRequest('Configure el RUT de la empresa emisora.')

  const env = params.env ?? 'certification'
  const cred = await getSiiCredentialForEnv(env)
  if (!cred) throw badRequest('Sube un certificado SII en Configuración.')
  if (!cred.portalRut || !cred.portalPassword) {
    throw badRequest(
      'Para sincronizar RCV se requiere RUT y clave tributaria del portal SII.',
    )
  }

  const { year, month } = parsePeriod(params.period)
  const tenantId = getTenantIdOrDefault()

  try {
    const session = await createSiiSession(
      { certPath: cred.certPath, certPassword: cred.certPassword, env },
      {
        rut: cred.portalRut,
        claveTributaria: cred.portalPassword,
        env,
      },
    )

    const invoices = await listInvoices(session.portal, {
      rut,
      issueType: params.type,
      period: { year, month },
    })

    await tenantQuery(
      `DELETE FROM sii.rcv_invoices
       WHERE tenant_id = $1 AND env = $2 AND issue_type = $3
         AND period_year = $4 AND period_month = $5`,
      [tenantId, env, params.type, year, month],
    )

    for (const inv of invoices) {
      await tenantQuery(
        `INSERT INTO sii.rcv_invoices (
           tenant_id, env, issue_type, period_year, period_month,
           dte_type, folio, issuer_rut, issuer_name, receiver_rut, receiver_name,
           issue_date, net_amount, tax_amount, total_amount, raw_payload
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          tenantId,
          env,
          params.type,
          year,
          month,
          inv.documentType ? Number.parseInt(String(inv.documentType), 10) : null,
          inv.number ?? null,
          inv.issuer?.rut ?? null,
          inv.issuer?.name ?? null,
          inv.receiver?.rut ?? null,
          inv.receiver?.name ?? null,
          inv.date ? inv.date.slice(0, 10) : null,
          inv.netAmount ?? null,
          inv.vatAmount ?? null,
          inv.totalAmount ?? null,
          JSON.stringify(inv),
        ],
      )
    }

    await tenantQuery(
      `UPDATE sii.settings SET last_rcv_sync_at = now(), updated_at = now()
       WHERE tenant_id = $1`,
      [tenantId],
    )

    return { synced: invoices.length }
  } finally {
    cleanupTempCert(cred.certPath)
  }
}

export async function listRcvInvoices(params: {
  period?: string
  type?: IssueType
  limit?: number
  offset?: number
}): Promise<{ items: RcvInvoiceDto[]; total: number }> {
  const tenantId = getTenantIdOrDefault()
  const conditions = ['tenant_id = $1']
  const values: unknown[] = [tenantId]
  let idx = 2

  if (params.period) {
    const { year, month } = parsePeriod(params.period)
    conditions.push(`period_year = $${idx++}`)
    values.push(year)
    conditions.push(`period_month = $${idx++}`)
    values.push(month)
  }
  if (params.type) {
    conditions.push(`issue_type = $${idx++}`)
    values.push(params.type)
  }

  const where = conditions.join(' AND ')
  const countResult = await tenantQuery<{ count: string }>(
    `SELECT count(*)::text AS count FROM sii.rcv_invoices WHERE ${where}`,
    values,
  )
  const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)

  const limit = params.limit ?? 50
  const offset = params.offset ?? 0
  const listResult = await tenantQuery<{
    id: string
    issue_type: IssueType
    period_year: number
    period_month: number
    dte_type: number | null
    folio: number | null
    issuer_rut: string | null
    issuer_name: string | null
    receiver_rut: string | null
    receiver_name: string | null
    issue_date: Date | string | null
    net_amount: string | number | null
    tax_amount: string | number | null
    total_amount: string | number | null
    synced_at: Date
  }>(
    `SELECT id, issue_type, period_year, period_month, dte_type, folio,
            issuer_rut, issuer_name, receiver_rut, receiver_name,
            issue_date, net_amount, tax_amount, total_amount, synced_at
     FROM sii.rcv_invoices
     WHERE ${where}
     ORDER BY issue_date DESC NULLS LAST, folio DESC NULLS LAST
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, limit, offset],
  )

  return {
    total,
    items: listResult.rows.map((row) => ({
      id: row.id,
      issueType: row.issue_type,
      periodYear: row.period_year,
      periodMonth: row.period_month,
      dteType: row.dte_type,
      folio: row.folio != null ? Number(row.folio) : null,
      issuerRut: row.issuer_rut,
      issuerName: row.issuer_name,
      receiverRut: row.receiver_rut,
      receiverName: row.receiver_name,
      issueDate: row.issue_date
        ? new Date(row.issue_date).toISOString().slice(0, 10)
        : null,
      netAmount: row.net_amount != null ? Number(row.net_amount) : null,
      taxAmount: row.tax_amount != null ? Number(row.tax_amount) : null,
      totalAmount: row.total_amount != null ? Number(row.total_amount) : null,
      syncedAt: row.synced_at.toISOString(),
    })),
  }
}
