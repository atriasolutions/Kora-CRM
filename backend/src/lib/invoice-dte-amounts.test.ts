import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildDteXmlAmounts,
  computeInvoiceDteAmounts,
  resolveInvoiceDteType,
} from './invoice-dte-amounts.js'

describe('computeInvoiceDteAmounts', () => {
  it('calcula factura 100% afecta con IVA 19%', () => {
    const amounts = computeInvoiceDteAmounts(
      [
        {
          totalCents: 100_000,
          subjectToVat: true,
          description: 'Servicio',
          quantity: 1,
          unitPriceCents: 100_000,
        },
      ],
      0,
      19,
    )
    assert.equal(amounts.taxableCents, 100_000)
    assert.equal(amounts.exemptCents, 0)
    assert.equal(amounts.taxCents, 19_000)
    assert.equal(amounts.totalCents, 119_000)
  })

  it('calcula factura 100% exenta sin IVA', () => {
    const amounts = computeInvoiceDteAmounts(
      [
        {
          totalCents: 50_000,
          subjectToVat: false,
          description: 'Exento',
          quantity: 1,
          unitPriceCents: 50_000,
        },
      ],
      0,
      19,
    )
    assert.equal(amounts.taxableCents, 0)
    assert.equal(amounts.exemptCents, 50_000)
    assert.equal(amounts.taxCents, 0)
    assert.equal(amounts.totalCents, 50_000)
  })

  it('calcula factura mixta con descuento global', () => {
    const amounts = computeInvoiceDteAmounts(
      [
        {
          totalCents: 100_000,
          subjectToVat: true,
          description: 'Afecto',
          quantity: 1,
          unitPriceCents: 100_000,
        },
        {
          totalCents: 40_000,
          subjectToVat: false,
          description: 'Exento',
          quantity: 1,
          unitPriceCents: 40_000,
        },
      ],
      10,
      19,
    )
    assert.equal(amounts.taxableCents, 90_000)
    assert.equal(amounts.exemptCents, 36_000)
    assert.equal(amounts.taxCents, 17_100)
    assert.equal(amounts.totalCents, 143_100)
  })
})

describe('resolveInvoiceDteType', () => {
  it('devuelve 34 si todas las líneas son exentas', () => {
    assert.equal(
      resolveInvoiceDteType([
        {
          totalCents: 1,
          subjectToVat: false,
          description: 'x',
          quantity: 1,
          unitPriceCents: 1,
        },
      ]),
      34,
    )
  })

  it('devuelve 33 si hay al menos una línea afecta', () => {
    assert.equal(
      resolveInvoiceDteType([
        {
          totalCents: 1,
          subjectToVat: true,
          description: 'a',
          quantity: 1,
          unitPriceCents: 1,
        },
        {
          totalCents: 1,
          subjectToVat: false,
          description: 'b',
          quantity: 1,
          unitPriceCents: 1,
        },
      ]),
      33,
    )
  })
})

describe('buildDteXmlAmounts', () => {
  it('mapea tipo 34 solo con monto exento', () => {
    const xml = buildDteXmlAmounts(
      34,
      computeInvoiceDteAmounts(
        [
          {
            totalCents: 50_000,
            subjectToVat: false,
            description: 'x',
            quantity: 1,
            unitPriceCents: 50_000,
          },
        ],
        0,
        19,
      ),
    )
    assert.equal(xml.montoExento, 500)
    assert.equal(xml.montoNeto, undefined)
    assert.equal(xml.iva, undefined)
  })
})
