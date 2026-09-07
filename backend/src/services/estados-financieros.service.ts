import { EXPENSE_CATEGORY_FUNCTION } from '../types/expense.js'
import type {
  FinancialStatementsManualLines,
  FinancialStatementsParams,
  FinancialStatementsResult,
  FinancialStatementLine,
  FinancialAnnexRow,
} from '../types/financial-statements.js'
import { tenantQuery } from '../db/tenant-query.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import { tenantWhereParam } from '../lib/tenant-sql.js'
import { formatCentsToMoney } from '../utils/money.js'

function centsToNum(cents: number): number {
  return Math.round(cents / 100)
}

function line(
  id: string,
  label: string,
  amountCents: number,
  opts?: Partial<FinancialStatementLine>,
): FinancialStatementLine {
  return {
    id,
    label,
    amountCents,
    amount: formatCentsToMoney(amountCents),
    amountNum: centsToNum(amountCents),
    source: opts?.source ?? 'kora',
    note: opts?.note,
  }
}

function emptyManual(
  partial?: FinancialStatementsManualLines,
): Required<FinancialStatementsManualLines> {
  return {
    cashCents: partial?.cashCents ?? 0,
    vatReceivableCents: partial?.vatReceivableCents ?? 0,
    otherCurrentAssetsCents: partial?.otherCurrentAssetsCents ?? 0,
    fixedAssetsNetCents: partial?.fixedAssetsNetCents ?? 0,
    intangiblesCents: partial?.intangiblesCents ?? 0,
    taxesPayableCents: partial?.taxesPayableCents ?? 0,
    otherCurrentLiabilitiesCents: partial?.otherCurrentLiabilitiesCents ?? 0,
    longTermDebtCents: partial?.longTermDebtCents ?? 0,
    capitalCents: partial?.capitalCents ?? 0,
    retainedEarningsCents: partial?.retainedEarningsCents ?? 0,
    costOfSalesCents: partial?.costOfSalesCents ?? null,
    financialIncomeCents: partial?.financialIncomeCents ?? 0,
    financialExpenseCents: partial?.financialExpenseCents ?? 0,
    incomeTaxCents: partial?.incomeTaxCents ?? 0,
  }
}

export async function buildFinancialStatements(
  params: FinancialStatementsParams,
): Promise<FinancialStatementsResult> {
  const tenantId = getTenantIdOrDefault()
  const { dateFrom, dateTo } = params
  const manual = emptyManual(params.manual)
  const gaps: string[] = []

  const [incomeRow, expenseRows, cxcRows, cxpRows, inventoryRows, partnerRows, companyRow] =
    await Promise.all([
      tenantQuery<{ invoices: string; boletas: string; credit_notes: string }>(
        `SELECT
          coalesce((
            SELECT sum(amount_cents)::text FROM crm_invoices
            WHERE deleted_at IS NULL AND archived_at IS NULL
              AND coalesce(document_kind, 'invoice') = 'invoice'
              AND status::text IN ('Pendiente', 'Pagada', 'Vencida')
              AND issue_date >= $1::date AND issue_date <= $2::date
              AND ${tenantWhereParam(3)}
          ), '0') AS invoices,
          coalesce((
            SELECT sum(amount_cents)::text FROM crm_boletas
            WHERE deleted_at IS NULL AND archived_at IS NULL
              AND status::text = 'Emitida'
              AND issue_date >= $1::date AND issue_date <= $2::date
              AND ${tenantWhereParam(3)}
          ), '0') AS boletas,
          coalesce((
            SELECT sum(amount_cents)::text FROM crm_invoices
            WHERE deleted_at IS NULL AND archived_at IS NULL
              AND document_kind = 'credit_note'
              AND status::text IN ('Pendiente', 'Pagada', 'Vencida')
              AND issue_date >= $1::date AND issue_date <= $2::date
              AND ${tenantWhereParam(3)}
          ), '0') AS credit_notes`,
        [dateFrom, dateTo, tenantId],
      ),
      tenantQuery<{ category: string; total: string; is_partner_loan: boolean }>(
        `SELECT category,
                sum(amount_cents)::text AS total,
                bool_or(coalesce(is_partner_loan, false)) AS is_partner_loan
         FROM crm_expenses
         WHERE deleted_at IS NULL AND archived_at IS NULL
           AND status = 'Registrado'
           AND expense_date >= $1::date AND expense_date <= $2::date
           AND ${tenantWhereParam(3)}
         GROUP BY category`,
        [dateFrom, dateTo, tenantId],
      ),
      tenantQuery<{
        id: string
        issue_date: string
        client: string
        tax_id: string | null
        folio: string | null
        taxable: string | null
        tax: string | null
        total: string
        status: string
        paid: string
      }>(
        `SELECT i.id,
                i.issue_date::text AS issue_date,
                coalesce(nullif(i.company_name, ''), nullif(i.contact_name, ''), '—') AS client,
                c.rut AS tax_id,
                i.sii_number::text AS folio,
                i.taxable_amount_cents::text AS taxable,
                i.tax_amount_cents::text AS tax,
                i.amount_cents::text AS total,
                i.status::text AS status,
                coalesce((
                  SELECT sum(p.amount_cents)
                  FROM crm_invoice_payments p
                  WHERE p.invoice_id = i.id AND p.status = 'Confirmado'
                ), 0)::text AS paid
         FROM crm_invoices i
         LEFT JOIN crm_companies c ON c.id = i.company_id
         WHERE i.deleted_at IS NULL AND i.archived_at IS NULL
           AND coalesce(i.document_kind, 'invoice') = 'invoice'
           AND i.status::text IN ('Pendiente', 'Vencida')
           AND i.issue_date <= $1::date
           AND ${tenantWhereParam(2, 'i')}
         ORDER BY i.issue_date`,
        [dateTo, tenantId],
      ),
      tenantQuery<{
        id: string
        order_date: string
        supplier: string
        tax_id: string | null
        reference: string
        total: string
      }>(
        `SELECT p.id,
                p.order_date::text AS order_date,
                p.supplier_name AS supplier,
                c.rut AS tax_id,
                p.reference,
                p.amount_cents::text AS total
         FROM crm_purchases p
         LEFT JOIN crm_companies c ON c.id = p.supplier_id
         WHERE p.deleted_at IS NULL AND p.archived_at IS NULL
           AND p.status::text IN ('Emitida', 'Confirmada')
           AND coalesce(p.payment_status::text, 'Pendiente') = 'Pendiente'
           AND p.order_date <= $1::date
           AND ${tenantWhereParam(2, 'p')}
         ORDER BY p.order_date`,
        [dateTo, tenantId],
      ),
      tenantQuery<{
        sku: string
        name: string
        qty: string
        unit_cost: string
      }>(
        `SELECT coalesce(ip.sku, pr.sku, '') AS sku,
                coalesce(ip.product_name, pr.name, '—') AS name,
                coalesce(ip.quantity_on_hand, 0)::text AS qty,
                coalesce(pr.cost_price_cents, 0)::text AS unit_cost
         FROM crm_inventory_positions ip
         LEFT JOIN crm_products pr ON pr.id = ip.product_id
         WHERE coalesce(ip.quantity_on_hand, 0) > 0
           AND ${tenantWhereParam(1, 'ip')}`,
        [tenantId],
      ),
      tenantQuery<{
        id: string
        expense_date: string
        concept: string
        category: string
        partner_name: string | null
        total: string
        is_partner_loan: boolean
      }>(
        `SELECT id, expense_date::text, concept, category, partner_name,
                amount_cents::text AS total,
                coalesce(is_partner_loan, false) AS is_partner_loan
         FROM crm_expenses
         WHERE deleted_at IS NULL AND archived_at IS NULL
           AND status = 'Registrado'
           AND expense_date >= $1::date AND expense_date <= $2::date
           AND (
             category IN ('Retiros', 'Retiros Socios')
             OR coalesce(is_partner_loan, false) = true
           )
           AND ${tenantWhereParam(3)}
         ORDER BY expense_date`,
        [dateFrom, dateTo, tenantId],
      ),
      tenantQuery<{ display_name: string | null }>(
        `SELECT display_name FROM crm_tenants WHERE id = $1 LIMIT 1`,
        [tenantId],
      ),
    ])

  const invoicesCents = Number(incomeRow.rows[0]?.invoices ?? 0)
  const boletasCents = Number(incomeRow.rows[0]?.boletas ?? 0)
  const creditNotesCents = Number(incomeRow.rows[0]?.credit_notes ?? 0)
  const revenueCents = invoicesCents + boletasCents - creditNotesCents

  let salesFnCents = 0
  let adminFnCents = 0
  let otherFnCents = 0
  let partnerCents = 0
  const expensesByCategory: FinancialAnnexRow[] = []

  for (const row of expenseRows.rows) {
    const total = Number(row.total)
    const fn = EXPENSE_CATEGORY_FUNCTION[row.category] ?? 'otro'
    expensesByCategory.push({
      category: row.category,
      amount: formatCentsToMoney(total),
      amountNum: centsToNum(total),
    })
    if (fn === 'socios' || row.is_partner_loan) {
      partnerCents += total
      continue
    }
    if (fn === 'ventas') salesFnCents += total
    else if (fn === 'administracion') adminFnCents += total
    else otherFnCents += total
  }

  const costOfSales =
    manual.costOfSalesCents != null ? manual.costOfSalesCents : 0
  if (manual.costOfSalesCents == null) {
    gaps.push('Costo de ventas (ingresar manualmente si aplica)')
  }

  const grossCents = revenueCents - costOfSales
  const operatingCents = grossCents - salesFnCents - adminFnCents + otherFnCents * -1
  // Otras ganancias/pérdidas: tratamos "otro" como gasto (resta)
  const operatingAdjusted = grossCents - salesFnCents - adminFnCents - otherFnCents
  const beforeTax =
    operatingAdjusted + manual.financialIncomeCents - manual.financialExpenseCents
  const netIncome = beforeTax - manual.incomeTaxCents

  const incomeStatement: FinancialStatementLine[] = [
    line('revenue', 'Ingresos de actividades ordinarias', revenueCents),
    line('cogs', 'Costo de ventas', costOfSales, {
      source: manual.costOfSalesCents != null ? 'manual' : 'estimado',
      note:
        manual.costOfSalesCents == null
          ? 'Sin dato fiable en Kora; completa manualmente'
          : undefined,
    }),
    line('gross', 'Ganancia (pérdida) bruta', grossCents, { source: 'calculado' }),
    line('sales_exp', 'Gastos de distribución / ventas', salesFnCents),
    line('admin_exp', 'Gastos de administración', adminFnCents),
    line('other_op', 'Otras ganancias (pérdidas)', -otherFnCents),
    line('operating', 'Resultado operacional', operatingAdjusted, {
      source: 'calculado',
    }),
    line('fin_inc', 'Ingresos financieros', manual.financialIncomeCents, {
      source: 'manual',
    }),
    line('fin_exp', 'Costos financieros', manual.financialExpenseCents, {
      source: 'manual',
    }),
    line('before_tax', 'Resultado antes de impuestos', beforeTax, {
      source: 'calculado',
    }),
    line('tax', 'Gasto por impuesto a la renta', manual.incomeTaxCents, {
      source: 'manual',
    }),
    line('net', 'Resultado del periodo', netIncome, { source: 'calculado' }),
  ]

  // CxC
  const cxc: FinancialAnnexRow[] = []
  let cxcCents = 0
  for (const r of cxcRows.rows) {
    const total = Number(r.total)
    const paid = Number(r.paid)
    const balance = r.status === 'Pagada' ? 0 : Math.max(0, total - paid)
    if (balance <= 0) continue
    cxcCents += balance
    cxc.push({
      date: r.issue_date,
      party: r.client,
      taxId: r.tax_id ?? '',
      folio: r.folio ?? '',
      taxable: r.taxable != null ? formatCentsToMoney(r.taxable) : '',
      tax: r.tax != null ? formatCentsToMoney(r.tax) : '',
      total: formatCentsToMoney(total),
      balance: formatCentsToMoney(balance),
      amountNum: centsToNum(balance),
    })
  }

  // CxP
  const cxp: FinancialAnnexRow[] = []
  let cxpCents = 0
  for (const r of cxpRows.rows) {
    const total = Number(r.total)
    cxpCents += total
    cxp.push({
      date: r.order_date,
      party: r.supplier,
      taxId: r.tax_id ?? '',
      folio: r.reference,
      total: formatCentsToMoney(total),
      balance: formatCentsToMoney(total),
      amountNum: centsToNum(total),
    })
  }

  // Inventario
  const inventory: FinancialAnnexRow[] = []
  let inventoryCents = 0
  for (const r of inventoryRows.rows) {
    const qty = Number(r.qty)
    const unit = Number(r.unit_cost)
    const val = Math.round(qty * unit)
    inventoryCents += val
    inventory.push({
      sku: r.sku,
      name: r.name,
      quantity: qty,
      unitCost: formatCentsToMoney(unit),
      valued: formatCentsToMoney(val),
      amountNum: centsToNum(val),
    })
  }

  const partners: FinancialAnnexRow[] = partnerRows.rows.map((r) => {
    const total = Number(r.total)
    return {
      date: r.expense_date,
      concept: r.concept,
      category: r.category,
      partner: r.partner_name ?? '',
      total: formatCentsToMoney(total),
      amountNum: centsToNum(total),
      isPartnerLoan: r.is_partner_loan,
    }
  })

  if (!manual.cashCents) gaps.push('Efectivo y equivalentes (caja/bancos)')
  if (!manual.capitalCents) gaps.push('Capital / aportes de socios')
  if (!manual.fixedAssetsNetCents) gaps.push('Activo fijo neto')

  const currentAssets =
    manual.cashCents +
    cxcCents +
    inventoryCents +
    manual.vatReceivableCents +
    manual.otherCurrentAssetsCents
  const nonCurrentAssets = manual.fixedAssetsNetCents + manual.intangiblesCents
  const totalAssets = currentAssets + nonCurrentAssets

  const currentLiab =
    cxpCents +
    manual.taxesPayableCents +
    manual.otherCurrentLiabilitiesCents
  const nonCurrentLiab = manual.longTermDebtCents
  const totalLiab = currentLiab + nonCurrentLiab

  const equity =
    manual.capitalCents +
    manual.retainedEarningsCents +
    netIncome -
    partnerCents
  const totalEquityLiab = totalLiab + equity
  const balanced = totalAssets === totalEquityLiab

  if (!balanced) {
    gaps.push(
      `Ecuación incompleta: Activo ${formatCentsToMoney(totalAssets)} ≠ Pasivo+Patrimonio ${formatCentsToMoney(totalEquityLiab)}`,
    )
  }

  const balanceSheet: FinancialStatementLine[] = [
    line('cash', 'Efectivo y equivalentes', manual.cashCents, { source: 'manual' }),
    line('ar', 'Deudores comerciales (CxC)', cxcCents),
    line('inv', 'Existencias / inventarios', inventoryCents),
    line('vat_rec', 'Impuestos por recuperar', manual.vatReceivableCents, {
      source: 'manual',
    }),
    line('oca', 'Otros activos corrientes', manual.otherCurrentAssetsCents, {
      source: 'manual',
    }),
    line('ca_total', 'Total activos corrientes', currentAssets, {
      source: 'calculado',
    }),
    line('ppe', 'Propiedades, planta y equipo (neto)', manual.fixedAssetsNetCents, {
      source: 'manual',
    }),
    line('int', 'Activos intangibles', manual.intangiblesCents, { source: 'manual' }),
    line('nca_total', 'Total activos no corrientes', nonCurrentAssets, {
      source: 'calculado',
    }),
    line('assets', 'Total activos', totalAssets, { source: 'calculado' }),
    line('ap', 'Acreedores comerciales (CxP)', cxpCents),
    line('tax_pay', 'Impuestos por pagar', manual.taxesPayableCents, {
      source: 'manual',
    }),
    line('ocl', 'Otros pasivos corrientes', manual.otherCurrentLiabilitiesCents, {
      source: 'manual',
    }),
    line('cl_total', 'Total pasivos corrientes', currentLiab, {
      source: 'calculado',
    }),
    line('ltd', 'Pasivos no corrientes', nonCurrentLiab, { source: 'manual' }),
    line('liab', 'Total pasivos', totalLiab, { source: 'calculado' }),
    line('capital', 'Capital', manual.capitalCents, { source: 'manual' }),
    line('re', 'Resultados acumulados', manual.retainedEarningsCents, {
      source: 'manual',
    }),
    line('ni', 'Resultado del ejercicio', netIncome, { source: 'calculado' }),
    line('withdrawals', '(−) Retiros / préstamos socios del periodo', -partnerCents),
    line('equity', 'Total patrimonio', equity, { source: 'calculado' }),
    line('liab_eq', 'Total pasivos + patrimonio', totalEquityLiab, {
      source: 'calculado',
    }),
  ]

  void operatingCents

  const company = companyRow.rows[0]

  return {
    meta: {
      companyName: company?.display_name?.trim() || 'Empresa',
      taxId: '',
      dateFrom,
      dateTo,
      currency: 'CLP',
      disclaimer:
        'Informe de gestión / apoyo al contador. No constituye estados financieros auditados ni Balance Tributario SII de 8 columnas.',
      balanced,
      gaps,
    },
    incomeStatement,
    balanceSheet,
    annexes: {
      expensesByCategory,
      cxc,
      cxp,
      inventory,
      partners,
    },
    totals: {
      revenueCents,
      netIncomeCents: netIncome,
      cxcCents,
      cxpCents,
      inventoryCents,
      partnerCents,
      totalAssetsCents: totalAssets,
      totalLiabilitiesCents: totalLiab,
      equityCents: equity,
    },
  }
}
