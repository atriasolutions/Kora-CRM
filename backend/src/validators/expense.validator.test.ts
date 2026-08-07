import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createExpenseSchema, updateExpenseSchema } from './expense.validator.js'

describe('expense receipt URLs', () => {
  it('acepta múltiples URLs válidas', () => {
    const result = createExpenseSchema.safeParse({
      concept: 'Servicio',
      amountNum: 1000,
      receiptUrls: [
        'https://drive.google.com/file/d/abc',
        'https://example.com/comprobante.pdf',
      ],
    })
    assert.equal(result.success, true)
  })

  it('rechaza una URL inválida', () => {
    const result = updateExpenseSchema.safeParse({
      receiptUrls: ['esto no es una url'],
    })
    assert.equal(result.success, false)
  })

  it('exige socio si es préstamo', () => {
    const result = createExpenseSchema.safeParse({
      concept: 'Préstamo',
      amountNum: 1000,
      isPartnerLoan: true,
    })
    assert.equal(result.success, false)
  })

  it('acepta préstamo con socio', () => {
    const result = createExpenseSchema.safeParse({
      concept: 'Préstamo',
      amountNum: 1000,
      isPartnerLoan: true,
      partnerName: 'Ana Ruiz',
      partnerLoanReturned: false,
    })
    assert.equal(result.success, true)
  })
})
