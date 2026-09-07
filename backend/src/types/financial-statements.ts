export type FinancialStatementsManualLines = {
  cashCents?: number
  vatReceivableCents?: number
  otherCurrentAssetsCents?: number
  fixedAssetsNetCents?: number
  intangiblesCents?: number
  taxesPayableCents?: number
  otherCurrentLiabilitiesCents?: number
  longTermDebtCents?: number
  capitalCents?: number
  retainedEarningsCents?: number
  /** null = sin dato (mostrar hueco). */
  costOfSalesCents?: number | null
  financialIncomeCents?: number
  financialExpenseCents?: number
  incomeTaxCents?: number
}

export type FinancialStatementsParams = {
  dateFrom: string
  dateTo: string
  manual?: FinancialStatementsManualLines
}

export type FinancialStatementLine = {
  id: string
  label: string
  amountCents: number
  amount: string
  amountNum: number
  source: 'kora' | 'manual' | 'calculado' | 'estimado'
  note?: string
}

export type FinancialAnnexRow = Record<string, string | number | boolean | undefined>

export type FinancialStatementsResult = {
  meta: {
    companyName: string
    taxId: string
    dateFrom: string
    dateTo: string
    currency: string
    disclaimer: string
    balanced: boolean
    gaps: string[]
  }
  incomeStatement: FinancialStatementLine[]
  balanceSheet: FinancialStatementLine[]
  annexes: {
    expensesByCategory: FinancialAnnexRow[]
    cxc: FinancialAnnexRow[]
    cxp: FinancialAnnexRow[]
    inventory: FinancialAnnexRow[]
    partners: FinancialAnnexRow[]
  }
  totals: {
    revenueCents: number
    netIncomeCents: number
    cxcCents: number
    cxpCents: number
    inventoryCents: number
    partnerCents: number
    totalAssetsCents: number
    totalLiabilitiesCents: number
    equityCents: number
  }
}
