import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

/**
 * Checklist de certificación SII (Fase 1).
 * Escenarios manuales post-deploy; estos tests verifican que el código expone los flujos.
 */
describe('SII certification checklist (Fase 1)', () => {
  const emitService = readFileSync(
    join(process.cwd(), 'src/services/sii-emit.service.ts'),
    'utf8',
  )
  const adjustmentRoutes = readFileSync(
    join(process.cwd(), 'src/routes/invoices.routes.ts'),
    'utf8',
  )
  const dteAmounts = readFileSync(
    join(process.cwd(), 'src/lib/invoice-dte-amounts.ts'),
    'utf8',
  )

  it('1. emite factura 33 con líneas mixtas (resolveDteTypeForDocument)', () => {
    assert.match(dteAmounts, /resolveDteTypeForDocument/)
    assert.match(dteAmounts, /34/)
    assert.match(emitService, /resolveDteTypeForDocument/)
  })

  it('2. emite factura 34 solo exenta', () => {
    assert.match(dteAmounts, /exemptCents/)
    assert.match(emitService, /34/)
  })

  it('3. NC parcial cod 3 sobre factura emitida', () => {
    assert.match(adjustmentRoutes, /credit-notes/)
    assert.match(emitService, /61/)
    assert.match(emitService, /referencias|Referencia/)
  })

  it('4. NC anulación total cod 1', () => {
    assert.match(adjustmentRoutes, /credit-notes/)
    assert.match(emitService, /referenceCode|reference_code|codRef/)
  })

  it('5. ND parcial cod 3', () => {
    assert.match(adjustmentRoutes, /debit-notes/)
    assert.match(emitService, /56/)
  })
})
