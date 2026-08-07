import { resolveCustomerSnapshots } from '../lib/relation-snapshots.js'
import { enforceRecordQuota } from '../lib/tenant-quota-enforce.js'
import {
  computeOpportunityLines,
  sumLineTotals,
  type ComputedLine,
} from '../lib/line-items.js'
import { pool } from '../db/pool.js'
import { setTenantLocal, tenantQuery, withTenantClient } from '../db/tenant-query.js'
import { pushTenantCondition, tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  mapOpportunityDetail,
  mapOpportunityRow,
  type OpportunityLineRow,
  type OpportunityRow,
} from '../mappers/opportunity.mapper.js'
import { maybeNotifyRecordOwnerChange, maybeNotifyRecordOwnerOnCreate } from '../lib/owner-assignment.js'
import { badRequest, notFound } from '../middleware/errors.js'
import type { AuditActor } from '../types/audit.js'
import type {
  CreateOpportunityInput,
  OpportunityDetail,
  OpportunityListItem,
  UpdateOpportunityInput,
} from '../types/opportunity.js'
import { probabilityPercentForStage } from '../lib/opportunity-stage.js'
import { parseDateInput } from '../utils/format.js'
import {
  parseMoneyToCents,
  parsePercentToInt,
  weightedCents,
} from '../utils/money.js'
import { paginationOffset } from '../utils/pagination.js'

import {
  pushInListCondition,
  pushDateRangeCondition,
  resolveOrderByClause,
} from '../lib/list-query.js'
import { purgeEntityNotesAndFiles } from '../services/entity-purge.service.js'

const OPP_COLUMNS = `
  id, name, customer_kind, company_id, company_name, contact_id, contact_name,
  amount_cents, weighted_amount_cents, stage, probability_pct, close_date,
  owner_name, opp_type, priority, outcome, forecast, source,
  contact_email, contact_phone, description, decision_maker, competitors,
  budget_label, buying_process, loss_reason,
  primary_quote_id,
  last_activity_at,
  created_at, created_by_id, created_by_name,
  updated_at, updated_by_id, updated_by_name
`

const LINE_COLUMNS = `
  id, opportunity_id, description, product_name, quantity,
  unit_price_cents, discount_pct, total_cents, sort_order
`

export type ListOpportunitiesParams = {
  page: number
  pageSize: number
  q?: string
  stage?: string
  outcome?: string
  companyId?: string
  contactId?: string
  archivedOnly?: boolean
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}

async function loadLineItems(
  opportunityId: string,
): Promise<OpportunityLineRow[]> {
  const result = await tenantQuery<OpportunityLineRow>(
    `SELECT ${LINE_COLUMNS}
     FROM crm_opportunity_line_items
     WHERE opportunity_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [opportunityId],
  )
  return result.rows
}

function resolveAmountCents(
  input: CreateOpportunityInput | UpdateOpportunityInput,
  lineTotal: number,
): number {
  if (input.amountCents != null) return input.amountCents
  if (input.amount) return parseMoneyToCents(input.amount)
  return lineTotal
}

async function insertLineItems(
  client: import('pg').PoolClient,
  opportunityId: string,
  lines: ReturnType<typeof computeOpportunityLines>,
): Promise<void> {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    await client.query(
      `INSERT INTO crm_opportunity_line_items (
        opportunity_id, description, product_name, quantity,
        unit_price_cents, discount_pct, total_cents, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        opportunityId,
        line.description,
        line.productName,
        line.quantity,
        line.unitPriceCents,
        line.discountPct,
        line.totalCents,
        i,
      ],
    )
  }
}


const OPPORTUNITY_SORT_COLUMNS: Record<string, string> = {
  name: 'name',
  amount: 'amount_cents',
  stage: 'stage',
  closeDate: 'close_date',
  owner: 'owner_name',
  companyName: 'company_name',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

export async function listOpportunities(
  params: ListOpportunitiesParams,
): Promise<{ items: OpportunityListItem[]; total: number }> {
  const conditions: string[] = ['deleted_at IS NULL']
  const values: unknown[] = []
  let idx = 1

  if (params.archivedOnly) {
    conditions.push('archived_at IS NOT NULL')
  } else {
    conditions.push('archived_at IS NULL')
  }
  idx = pushTenantCondition(conditions, values, idx)
  idx = pushInListCondition(conditions, values, idx, 'stage', params.stage)
  if (params.outcome) {
    conditions.push(`outcome = $${idx++}`)
    values.push(params.outcome)
  }
  if (params.companyId) {
    conditions.push(
      `(company_id = $${idx} OR (
        company_id IS NULL AND company_name <> ''
        AND company_name = (SELECT name FROM crm_companies WHERE id = $${idx})
      ))`,
    )
    values.push(params.companyId)
    idx++
  }
  if (params.contactId) {
    conditions.push(`contact_id = $${idx++}`)
    values.push(params.contactId)
  }
  if (params.q) {
    conditions.push(
      `(name ILIKE $${idx} OR company_name ILIKE $${idx} OR contact_name ILIKE $${idx})`,
    )
    values.push(`%${params.q}%`)
    idx++
  }

  idx = pushDateRangeCondition(
    conditions,
    values,
    idx,
    'close_date',
    params.dateFrom,
    params.dateTo,
  )

  const orderBy = resolveOrderByClause(
    params.sortBy,
    params.sortDir,
    OPPORTUNITY_SORT_COLUMNS,
    'updated_at DESC',
  )

  const where = `WHERE ${conditions.join(' AND ')}`

  return withTenantClient(async (client) => {
    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM crm_opportunities ${where}`,
      values,
    )
    const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)

    const offset = paginationOffset(params.page, params.pageSize)
    const listValues = [...values, params.pageSize, offset]

    const result = await client.query<OpportunityRow>(
      `SELECT ${OPP_COLUMNS}
       FROM crm_opportunities
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${idx++} OFFSET $${idx}`,
      listValues,
    )

    return { items: result.rows.map(mapOpportunityRow), total }
  })
}

export async function getOpportunityById(id: string): Promise<OpportunityDetail> {
  const result = await tenantQuery<OpportunityRow>(
    `SELECT ${OPP_COLUMNS}
     FROM crm_opportunities
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Oportunidad no encontrada')
  const lines = await loadLineItems(id)
  return mapOpportunityDetail(row, lines)
}

export async function createOpportunity(
  input: CreateOpportunityInput,
  actor: AuditActor,
): Promise<OpportunityDetail> {
  await enforceRecordQuota(actor)
  if (!input.name?.trim()) throw badRequest('El nombre es obligatorio')

  const lines = computeOpportunityLines(input.lineItems)
  const lineTotal = sumLineTotals(lines)
  const amountCents = resolveAmountCents(input, lineTotal)
  const stage = input.stage ?? 'Calificados'
  const probabilityPct = probabilityPercentForStage(stage)
  const weighted = weightedCents(amountCents, probabilityPct)

  const customer = await resolveCustomerSnapshots({
    companyId: input.companyId,
    companyName: input.company,
    contactId: input.contactId,
    contactName: input.contactName,
  })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)

    const result = await client.query<OpportunityRow>(
      `INSERT INTO crm_opportunities (
        name, customer_kind, company_id, company_name, contact_id, contact_name,
        amount_cents, weighted_amount_cents, stage, probability_pct, close_date,
        owner_name, opp_type, priority, outcome, forecast, source,
        contact_email, contact_phone, description, decision_maker, competitors,
        budget_label, buying_process, loss_reason,
        created_by_id, created_by_name, updated_by_id, updated_by_name, tenant_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22,
        $23, $24, $25,
        $26, $27, $26, $27, $28
      )
      RETURNING ${OPP_COLUMNS}`,
      [
        input.name.trim(),
        input.customerKind ?? 'empresa',
        customer.companyId,
        customer.companyName,
        customer.contactId,
        customer.contactName,
        amountCents,
        weighted,
        stage,
        probabilityPct,
        parseDateInput(input.closeDate),
        input.owner?.trim() || actor.userName,
        input.type?.trim() || 'Nuevo negocio',
        input.priority?.trim() || 'Media',
        input.outcome ?? 'Abierta',
        input.forecast?.trim() || 'En pipeline',
        input.source?.trim() || null,
        input.contactEmail?.trim() ?? '',
        input.contactPhone?.trim() ?? '',
        input.description?.trim() ?? '',
        input.decisionMaker?.trim() ?? '',
        input.competitors?.trim() ?? '',
        input.budget?.trim() ?? '',
        input.buyingProcess?.trim() ?? '',
        input.lossReason?.trim() || null,
        actor.userId,
        actor.userName,
        getTenantIdOrDefault(),
      ],
    )

    const row = result.rows[0]!
    await insertLineItems(client, row.id, lines)
    await client.query('COMMIT')

    const lineRows = await loadLineItems(row.id)
    const detail = mapOpportunityDetail(row, lineRows)
    maybeNotifyRecordOwnerOnCreate({
      actor,
      nextOwner: detail.owner ?? '',
      moduleLabel: 'la oportunidad',
      recordTitle: detail.name,
      href: `/oportunidades/${detail.id}`,
      entityType: 'oportunidad',
      entityId: detail.id,
    })
    return detail
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function updateOpportunity(
  id: string,
  input: UpdateOpportunityInput,
  actor: AuditActor,
): Promise<OpportunityDetail> {
  const existing = await getOpportunityById(id)
  const previousOwner = existing.owner ?? ''

  let companyId = existing.companyId ?? null
  let companyName = existing.company
  let contactId = existing.contactId ?? null
  let contactName = existing.contactName

  if (
    input.companyId !== undefined ||
    input.company !== undefined ||
    input.contactId !== undefined ||
    input.contactName !== undefined
  ) {
    const resolved = await resolveCustomerSnapshots({
      companyId: input.companyId ?? companyId,
      companyName: input.company ?? companyName,
      contactId: input.contactId ?? contactId,
      contactName: input.contactName ?? contactName,
    })
    companyId = resolved.companyId
    companyName = resolved.companyName
    contactId = resolved.contactId
    contactName = resolved.contactName
  }

  const lines =
    input.lineItems !== undefined
      ? computeOpportunityLines(input.lineItems)
      : null
  const lineTotal = lines ? sumLineTotals(lines) : null
  const amountCents =
    input.amountCents != null
      ? input.amountCents
      : input.amount
        ? parseMoneyToCents(input.amount)
        : lineTotal ?? parseMoneyToCents(existing.amount)

  const nextStage = input.stage ?? existing.stage
  const probabilityPct =
    input.stage !== undefined
      ? probabilityPercentForStage(nextStage)
      : input.probability !== undefined
        ? parsePercentToInt(input.probability)
        : probabilityPercentForStage(existing.stage)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)

    const detailFields = {
      contactEmail:
        input.contactEmail !== undefined
          ? input.contactEmail.trim()
          : existing.contactEmail,
      contactPhone:
        input.contactPhone !== undefined
          ? input.contactPhone.trim()
          : existing.contactPhone,
      description:
        input.description !== undefined
          ? input.description.trim()
          : existing.description,
      decisionMaker:
        input.decisionMaker !== undefined
          ? input.decisionMaker.trim()
          : existing.decisionMaker,
      competitors:
        input.competitors !== undefined
          ? input.competitors.trim()
          : existing.competitors,
      budget:
        input.budget !== undefined ? input.budget.trim() : existing.budget,
      buyingProcess:
        input.buyingProcess !== undefined
          ? input.buyingProcess.trim()
          : existing.buyingProcess,
      lossReason:
        input.lossReason !== undefined
          ? input.lossReason.trim() || null
          : existing.lossReason ?? null,
    }

    const result = await client.query<OpportunityRow>(
      `UPDATE crm_opportunities SET
        name = $2,
        customer_kind = $3,
        company_id = $4,
        company_name = $5,
        contact_id = $6,
        contact_name = $7,
        amount_cents = $8,
        weighted_amount_cents = $9,
        stage = $10,
        probability_pct = $11,
        close_date = COALESCE($12, close_date),
        owner_name = $13,
        opp_type = $14,
        priority = $15,
        outcome = $16,
        forecast = $17,
        source = $18,
        contact_email = $19,
        contact_phone = $20,
        description = $21,
        decision_maker = $22,
        competitors = $23,
        budget_label = $24,
        buying_process = $25,
        loss_reason = $26,
        updated_by_id = $27,
        updated_by_name = $28,
        updated_at = now()
      WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(29)}
      RETURNING ${OPP_COLUMNS}`,
      [
        id,
        input.name?.trim() ?? existing.name,
        input.customerKind ?? existing.customerKind ?? 'empresa',
        companyId,
        companyName,
        contactId,
        contactName,
        amountCents,
        weightedCents(amountCents, probabilityPct),
        nextStage,
        probabilityPct,
        input.closeDate !== undefined ? parseDateInput(input.closeDate) : null,
        input.owner?.trim() ?? existing.owner,
        input.type?.trim() ?? existing.type,
        input.priority?.trim() ?? existing.priority,
        input.outcome ?? existing.outcome,
        input.forecast?.trim() ?? existing.forecast,
        input.source?.trim() ?? existing.source,
        detailFields.contactEmail,
        detailFields.contactPhone,
        detailFields.description,
        detailFields.decisionMaker,
        detailFields.competitors,
        detailFields.budget,
        detailFields.buyingProcess,
        detailFields.lossReason,
        actor.userId,
        actor.userName,
        getTenantIdOrDefault(),
      ],
    )
    const row = result.rows[0]
    if (!row) throw notFound('Oportunidad no encontrada')

    if (lines) {
      await client.query(
        `DELETE FROM crm_opportunity_line_items WHERE opportunity_id = $1`,
        [id],
      )
      await insertLineItems(client, id, lines)
    }

    await client.query('COMMIT')
    const detail = mapOpportunityDetail(row, await loadLineItems(id))
    if (input.owner !== undefined) {
      maybeNotifyRecordOwnerChange({
        actor,
        previousOwner,
        nextOwner: detail.owner ?? '',
        moduleLabel: 'la oportunidad',
        recordTitle: detail.name,
        href: `/oportunidades/${detail.id}`,
        entityType: 'oportunidad',
        entityId: detail.id,
      })
    }
    return detail
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function softDeleteOpportunity(
  id: string,
  actor: AuditActor,
): Promise<void> {
  const result = await tenantQuery(
    `UPDATE crm_opportunities
     SET deleted_at = now(), updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  if (result.rowCount === 0) throw notFound('Oportunidad no encontrada')
  await purgeEntityNotesAndFiles('oportunidad', id)
}

export async function archiveOpportunity(
  id: string,
  actor: AuditActor,
): Promise<OpportunityDetail> {
  const result = await tenantQuery<OpportunityRow>(
    `UPDATE crm_opportunities
     SET archived_at = now(), updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND archived_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${OPP_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Oportunidad no encontrada o ya archivada')
  return mapOpportunityDetail(row, await loadLineItems(id))
}

export async function restoreOpportunity(
  id: string,
  actor: AuditActor,
): Promise<OpportunityDetail> {
  const result = await tenantQuery<OpportunityRow>(
    `UPDATE crm_opportunities
     SET archived_at = NULL, updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${OPP_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Oportunidad no encontrada')
  return mapOpportunityDetail(row, await loadLineItems(id))
}

export type SyncOpportunityFromQuoteData = {
  quoteId: string
  amountCents: number
  lines: ComputedLine[]
  probabilityPct: number | null
  closeDate?: string
}

export async function syncOpportunityFromQuoteData(
  opportunityId: string,
  data: SyncOpportunityFromQuoteData,
  actor: AuditActor,
): Promise<OpportunityDetail> {
  const weighted = weightedCents(data.amountCents, data.probabilityPct)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)

    const result = await client.query<OpportunityRow>(
      `UPDATE crm_opportunities SET
        amount_cents = $2,
        weighted_amount_cents = $3,
        primary_quote_id = $4,
        close_date = COALESCE($5::date, close_date),
        updated_by_id = $6,
        updated_by_name = $7,
        updated_at = now()
      WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(8)}
      RETURNING ${OPP_COLUMNS}`,
      [
        opportunityId,
        data.amountCents,
        weighted,
        data.quoteId,
        data.closeDate ? parseDateInput(data.closeDate) : null,
        actor.userId,
        actor.userName,
        getTenantIdOrDefault(),
      ],
    )
    const row = result.rows[0]
    if (!row) throw notFound('Oportunidad no encontrada')

    await client.query(
      `DELETE FROM crm_opportunity_line_items WHERE opportunity_id = $1`,
      [opportunityId],
    )
    await insertLineItems(client, opportunityId, data.lines)

    await client.query('COMMIT')
    return mapOpportunityDetail(row, await loadLineItems(opportunityId))
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
