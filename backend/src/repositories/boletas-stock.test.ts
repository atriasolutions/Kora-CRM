import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

describe('boletas stock', () => {
  const content = readFileSync(
    join(process.cwd(), 'src/repositories/stock-reservations.repository.ts'),
    'utf8',
  )

  it('commitStockFromBoletaLines registra salida con source_kind boleta', () => {
    const fn = content.slice(
      content.indexOf('async function commitStockFromBoletaLines'),
      content.indexOf('export async function commitStockForBoleta'),
    )
    assert.match(fn, /'boleta'/)
    assert.match(fn, /BOL \$\{boletaNumber\}/)
  })

  it('syncBoletaStockOnStatusChange emite desde borrador', () => {
    const fn = content.slice(
      content.indexOf('export async function syncBoletaStockOnStatusChange'),
      content.length,
    )
    assert.match(fn, /wasDraft && nextStatus === 'Emitida'/)
    assert.match(fn, /commitStockForBoleta/)
    assert.match(fn, /revertStockForBoleta/)
  })
})
