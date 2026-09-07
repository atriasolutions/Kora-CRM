import { z } from 'zod'

const financialManualSchema = z
  .object({
    cashCents: z.number().optional(),
    vatReceivableCents: z.number().optional(),
    otherCurrentAssetsCents: z.number().optional(),
    fixedAssetsNetCents: z.number().optional(),
    intangiblesCents: z.number().optional(),
    taxesPayableCents: z.number().optional(),
    otherCurrentLiabilitiesCents: z.number().optional(),
    longTermDebtCents: z.number().optional(),
    capitalCents: z.number().optional(),
    retainedEarningsCents: z.number().optional(),
    costOfSalesCents: z.number().nullable().optional(),
    financialIncomeCents: z.number().optional(),
    financialExpenseCents: z.number().optional(),
    incomeTaxCents: z.number().optional(),
  })
  .optional()

export const executeFinancialStatementsSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  manual: financialManualSchema,
})
