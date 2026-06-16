import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  assertCreditNoteWithinBalance,
  assertDebitNoteWithinBalance,
  resolveAdjustmentReferenceCode,
} from './invoice-adjustment.service.js'

describe('resolveAdjustmentReferenceCode', () => {
  it('usa cod 1 en anulación total de NC', () => {
    assert.equal(resolveAdjustmentReferenceCode('full', 'credit_note'), 1)
  })

  it('usa cod 3 en NC parcial', () => {
    assert.equal(resolveAdjustmentReferenceCode('partial', 'credit_note'), 3)
  })

  it('usa cod 3 en ND total o parcial por defecto', () => {
    assert.equal(resolveAdjustmentReferenceCode('full', 'debit_note'), 3)
    assert.equal(resolveAdjustmentReferenceCode('partial', 'debit_note'), 3)
  })

  it('respeta código explícito', () => {
    assert.equal(resolveAdjustmentReferenceCode('full', 'credit_note', 2), 2)
  })
})

describe('assertCreditNoteWithinBalance', () => {
  it('permite NC parcial dentro del saldo', () => {
    assert.doesNotThrow(() =>
      assertCreditNoteWithinBalance(119_000, 50_000, 30_000),
    )
  })

  it('rechaza NC que supera saldo disponible', () => {
    assert.throws(
      () => assertCreditNoteWithinBalance(119_000, 100_000, 30_000),
      /supera el saldo disponible/,
    )
  })

  it('rechaza NC cuando la factura ya fue acreditada por completo', () => {
    assert.throws(
      () => assertCreditNoteWithinBalance(119_000, 119_000, 1),
      /acreditada por completo/,
    )
  })
})

describe('assertDebitNoteWithinBalance', () => {
  it('permite ND parcial acumulada dentro del total origen', () => {
    assert.doesNotThrow(() => assertDebitNoteWithinBalance(119_000, 20_000, 30_000))
  })

  it('rechaza ND acumulada que supera el total de la factura', () => {
    assert.throws(
      () => assertDebitNoteWithinBalance(119_000, 100_000, 30_000),
      /supera el total de la factura origen/,
    )
  })
})
