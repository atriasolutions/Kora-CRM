import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { computeQuoteLinesWithCurrency } from './document-line-items.js'

describe('computeQuoteLinesWithCurrency CLP', () => {
  const emptyRates = {
    rateDate: '2026-07-15',
    ufClp: 0,
    usdClp: 0,
    eurClp: 0,
  }

  it('convierte precios CLP > $1.000.000 a centavos sin truncar ×100', () => {
    const { lines } = computeQuoteLinesWithCurrency(
      [
        {
          productName: 'Desarrollo Servicio Web',
          quantity: 1,
          discount: '30%',
          priceCurrency: 'CLP',
          unitPriceOriginal: 1_499_990,
          unitPrice: '$1.499.990',
        },
      ],
      emptyRates,
      new Map(),
    )

    assert.equal(lines.length, 1)
    assert.equal(lines[0]!.unitPriceOriginal, 1_499_990)
    assert.equal(lines[0]!.unitPriceCents, 149_999_000)
    assert.equal(lines[0]!.totalCents, 104_999_300)
  })

  it('sigue convirtiendo bien precios CLP bajo $1.000.000', () => {
    const { lines } = computeQuoteLinesWithCurrency(
      [
        {
          productName: 'Diagnóstico',
          quantity: 1,
          discount: '10%',
          priceCurrency: 'CLP',
          unitPriceOriginal: 499_990,
          unitPrice: '$499.990',
        },
      ],
      emptyRates,
      new Map(),
    )

    assert.equal(lines[0]!.unitPriceCents, 49_999_000)
    assert.equal(lines[0]!.totalCents, 44_999_100)
  })
})
