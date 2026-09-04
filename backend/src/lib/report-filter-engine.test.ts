import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  evaluateFilterCondition,
  filterReportRows,
  normalizeFilterExpression,
  parseFilterDate,
} from './report-filter-engine.js'
import type { ReportFilterCondition, ReportTableRow } from '../types/report-table.js'

function cond(
  partial: Partial<ReportFilterCondition> & Pick<ReportFilterCondition, 'fieldId' | 'operator'>,
): ReportFilterCondition {
  return {
    id: partial.id ?? 'c1',
    fieldId: partial.fieldId,
    operator: partial.operator,
    value: partial.value ?? '',
  }
}

describe('report-filter-engine dates', () => {
  it('parseFilterDate acepta ISO, dd/mm/yyyy y etiquetas es-CL', () => {
    assert.equal(parseFilterDate('2026-08-01'), '2026-08-01')
    assert.equal(parseFilterDate('01/08/2026'), '2026-08-01')
    assert.equal(parseFilterDate('1 jul 2026'), '2026-07-01')
    assert.equal(parseFilterDate('30 jun 2026'), '2026-06-30')
  })

  it('Fecha gasto menor que 2026-08-01 incluye julio', () => {
    const rows: ReportTableRow[] = [
      { id: '1', expenseDate: '1 jul 2026', expenseDateIso: '2026-07-01' },
      { id: '2', expenseDate: '15 ago 2026', expenseDateIso: '2026-08-15' },
      { id: '3', expenseDate: '30 jun 2026' },
    ]
    const conditions = [
      cond({ fieldId: 'expenseDate', operator: 'less', value: '2026-08-01' }),
    ]
    const { rows: out, error } = filterReportRows(rows, conditions, 'all-and', '')
    assert.equal(error, undefined)
    assert.deepEqual(
      out.map((r) => r.id),
      ['1', '3'],
    )
  })

  it('equals fecha compara etiqueta con input date', () => {
    const row: ReportTableRow = { expenseDate: '1 jul 2026' }
    assert.equal(
      evaluateFilterCondition(
        row,
        cond({ fieldId: 'expenseDate', operator: 'equals', value: '2026-07-01' }),
      ),
      true,
    )
  })

  it('no usa parseNumber corrupto sobre fechas sin Iso', () => {
    const row: ReportTableRow = { expenseDate: '15 jul 2026' }
    assert.equal(
      evaluateFilterCondition(
        row,
        cond({ fieldId: 'expenseDate', operator: 'less', value: '2026-08-01' }),
      ),
      true,
    )
    assert.equal(
      evaluateFilterCondition(
        row,
        cond({ fieldId: 'expenseDate', operator: 'greater', value: '2026-08-01' }),
      ),
      false,
    )
  })
})

describe('report-filter-engine combine', () => {
  const rows: ReportTableRow[] = [
    { id: 'a', status: 'Registrado', amountNum: '100' },
    { id: 'b', status: 'Borrador', amountNum: '500' },
    { id: 'c', status: 'Registrado', amountNum: '900' },
  ]

  const conditions = [
    cond({ id: '1', fieldId: 'status', operator: 'equals', value: 'Registrado' }),
    cond({ id: '2', fieldId: 'amountNum', operator: 'greater', value: '200' }),
  ]

  it('all-and exige ambas', () => {
    const { rows: out } = filterReportRows(rows, conditions, 'all-and', '')
    assert.deepEqual(
      out.map((r) => r.id),
      ['c'],
    )
  })

  it('any-or acepta cualquiera', () => {
    const { rows: out } = filterReportRows(rows, conditions, 'any-or', '')
    assert.deepEqual(
      out.map((r) => r.id).sort(),
      ['a', 'b', 'c'],
    )
  })

  it('custom 1 Y 2', () => {
    const { rows: out } = filterReportRows(rows, conditions, 'custom', '1 Y 2')
    assert.deepEqual(
      out.map((r) => r.id),
      ['c'],
    )
  })

  it('custom 1 O 2 y formas pegadas', () => {
    assert.equal(normalizeFilterExpression('1Y2'), '1 && 2')
    const { rows: out } = filterReportRows(rows, conditions, 'custom', '1 O 2')
    assert.deepEqual(
      out.map((r) => r.id).sort(),
      ['a', 'b', 'c'],
    )
  })

  it('custom con paréntesis (1 Y 2) O ...', () => {
    const three = [
      ...conditions,
      cond({ id: '3', fieldId: 'id', operator: 'equals', value: 'a' }),
    ]
    const { rows: out } = filterReportRows(rows, three, 'custom', '(1 Y 2) O 3')
    assert.deepEqual(
      out.map((r) => r.id).sort(),
      ['a', 'c'],
    )
  })
})
