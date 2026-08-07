import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  createBoletaSchema,
  updateBoletaSchema,
} from '../validators/boleta.validator.js'

describe('boleta.validator', () => {
  it('permite crear borrador sin comprador ni líneas', () => {
    const parsed = createBoletaSchema.parse({
      status: 'Borrador',
    })
    assert.equal(parsed.status, 'Borrador')
  })

  it('exige líneas al emitir', () => {
    assert.throws(() =>
      createBoletaSchema.parse({
        status: 'Emitida',
        lineItems: [],
      }),
    )
  })

  it('acepta emitir con al menos una línea', () => {
    const parsed = createBoletaSchema.parse({
      status: 'Emitida',
      lineItems: [
        {
          description: 'Producto demo',
          quantity: 1,
          unitPrice: '1000',
        },
      ],
    })
    assert.equal(parsed.status, 'Emitida')
    assert.equal(parsed.lineItems?.length, 1)
  })

  it('update acepta parches parciales', () => {
    const parsed = updateBoletaSchema.parse({ notes: 'Observación' })
    assert.equal(parsed.notes, 'Observación')
  })
})
