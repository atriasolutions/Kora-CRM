import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

import { invoicingModeSchema } from '../validators/settings.validator.js'

describe('invoicingModeSchema', () => {
  it('accepts manual and sii', () => {
    assert.equal(invoicingModeSchema.parse('manual'), 'manual')
    assert.equal(invoicingModeSchema.parse('sii'), 'sii')
  })

  it('rejects unknown modes', () => {
    assert.throws(() => invoicingModeSchema.parse('external'))
  })
})

describe('SII services tenant isolation', () => {
  const servicesDir = join(process.cwd(), 'src/services')

  it('servicios SII usan tenantQuery (no acceso cross-tenant)', () => {
    const files = readdirSync(servicesDir).filter((f) => f.startsWith('sii-') && f.endsWith('.service.ts'))
    const missing: string[] = []

    for (const file of files) {
      const content = readFileSync(join(servicesDir, file), 'utf8')
      if (!content.includes('tenantQuery')) {
        missing.push(file)
      }
    }

    assert.deepEqual(missing, [], `Servicios SII sin tenantQuery: ${missing.join(', ')}`)
  })
})
