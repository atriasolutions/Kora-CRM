import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  defaultDashboardPeriod,
  getPeriodRanges,
} from './dashboard-period.js'
import { chileDateString, chilePartsFromDate } from './chile-timezone.js'

describe('dashboard-period Chile', () => {
  it('defaultDashboardPeriod usa mes calendario Chile', () => {
    const now = new Date('2026-07-01T03:00:00.000Z')
    const period = defaultDashboardPeriod(now)
    const parts = chilePartsFromDate(now)
    assert.equal(period.mode, 'month')
    if (period.mode === 'month') {
      assert.equal(period.year, parts.year)
      assert.equal(period.month, parts.month - 1)
    }
  })

  it('getPeriodRanges de julio no se corre a junio por UTC', () => {
    const ranges = getPeriodRanges({ mode: 'month', year: 2026, month: 6 })
    assert.equal(ranges.rangeStartDate, '2026-07-01')
    assert.equal(ranges.rangeEndDate, '2026-07-31')
    assert.equal(chileDateString(ranges.rangeStart), '2026-07-01')
    assert.equal(chileDateString(ranges.rangeEndExclusive), '2026-08-01')
    assert.ok(ranges.rangeStart.getTime() < ranges.rangeEndExclusive.getTime())
  })

  it('resuelve enero y julio aunque ICU use hour=24', () => {
    const jan = getPeriodRanges({ mode: 'year', year: 2026 })
    assert.equal(jan.rangeStartDate, '2026-01-01')
    assert.equal(chileDateString(jan.rangeStart), '2026-01-01')
    const jul = getPeriodRanges({ mode: 'month', year: 2026, month: 6 })
    assert.equal(chileDateString(jul.rangeStart), '2026-07-01')
  })

  it('año completo usa límites Chile', () => {
    const ranges = getPeriodRanges({ mode: 'year', year: 2026 })
    assert.equal(ranges.rangeStartDate, '2026-01-01')
    assert.equal(ranges.rangeEndDate, '2026-12-31')
    assert.equal(chileDateString(ranges.rangeEndExclusive), '2027-01-01')
  })
})
