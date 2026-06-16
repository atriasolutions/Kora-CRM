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

describe('sii-status.service DTE types', () => {
  it('expone checklist de CAF 33/34/56/61', () => {
    const content = readFileSync(
      join(process.cwd(), 'src/services/sii-status.service.ts'),
      'utf8',
    )
    assert.match(content, /folioTypesAvailable/)
    assert.match(content, /folioTypesMissing/)
    assert.match(content, /REQUIRED_DTE_TYPES/)
    assert.match(content, /33/)
    assert.match(content, /34/)
    assert.match(content, /56/)
    assert.match(content, /61/)
  })
})
