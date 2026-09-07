import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_FUNCTION } from '../types/expense.js'

describe('expense categories homologation', () => {
  it('incluye categorías operativas y de planilla', () => {
    assert.ok(EXPENSE_CATEGORIES.includes('Servicios'))
    assert.ok(EXPENSE_CATEGORIES.includes('Viáticos'))
    assert.ok(EXPENSE_CATEGORIES.includes('Retiros Socios'))
    assert.ok(EXPENSE_CATEGORIES.includes('Patente Comercial'))
  })

  it('mapea categorías a función contable', () => {
    assert.equal(EXPENSE_CATEGORY_FUNCTION['Marketing'], 'ventas')
    assert.equal(EXPENSE_CATEGORY_FUNCTION['Servicios'], 'administracion')
    assert.equal(EXPENSE_CATEGORY_FUNCTION['Retiros Socios'], 'socios')
  })
})
