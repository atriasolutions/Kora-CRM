import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  formatVariantLabel,
  generateVariantCombinations,
  groupInventoryByFamily,
  isSellableProduct,
  resolveVariantKind,
  suggestVariantSku,
} from './product-variants.js'

describe('product-variants helpers', () => {
  it('genera combinaciones Color × Talla', () => {
    const combos = generateVariantCombinations([
      { name: 'Color', values: ['Rojo', 'Negro'] },
      { name: 'Talla', values: ['S', 'M'] },
    ])
    assert.equal(combos.length, 4)
    assert.deepEqual(combos[0], { Color: 'Rojo', Talla: 'S' })
    assert.deepEqual(combos[3], { Color: 'Negro', Talla: 'M' })
  })

  it('sugiere SKU a partir de atributos', () => {
    const sku = suggestVariantSku(
      '0000238',
      { Color: 'Rojo', Talla: 'M' },
      ['Color', 'Talla'],
    )
    assert.equal(sku, '0000238-ROJO-M')
  })

  it('formatea label de variedad', () => {
    assert.equal(
      formatVariantLabel('Polera GnR', { Color: 'Negro', Talla: 'M' }, [
        'Color',
        'Talla',
      ]),
      'Polera GnR · Negro · M',
    )
  })

  it('resuelve kind y sellable', () => {
    assert.equal(resolveVariantKind({}), 'simple')
    assert.equal(resolveVariantKind({ variantsCount: 2 }), 'parent')
    assert.equal(
      resolveVariantKind({ parentProductId: 'x' }),
      'variant',
    )
    assert.equal(isSellableProduct({ variantsCount: 2 }), false)
    assert.equal(isSellableProduct({ parentProductId: 'x' }), true)
    assert.equal(isSellableProduct({}), true)
  })

  it('agrupa inventario por familia Color → Talla', () => {
    const tree = groupInventoryByFamily(
      [
        {
          productId: '1',
          sku: 'P-ROJO-M',
          productName: 'Polera · Rojo · M',
          attributes: { Color: 'Rojo', Talla: 'M' },
          quantityOnHand: 3,
          quantityReserved: 0,
          quantityAvailable: 3,
        },
        {
          productId: '2',
          sku: 'P-ROJO-S',
          productName: 'Polera · Rojo · S',
          attributes: { Color: 'Rojo', Talla: 'S' },
          quantityOnHand: 2,
          quantityReserved: 0,
          quantityAvailable: 2,
        },
        {
          productId: '3',
          sku: 'P-NEG-M',
          productName: 'Polera · Negro · M',
          attributes: { Color: 'Negro', Talla: 'M' },
          quantityOnHand: 15,
          quantityReserved: 0,
          quantityAvailable: 15,
        },
      ],
      ['Color', 'Talla'],
    )

    assert.equal(tree.length, 1)
    assert.equal(tree[0]!.quantityOnHand, 20)
    const colors = tree[0]!.children ?? []
    const rojo = colors.find((c) => c.label === 'Color: Rojo')
    assert.ok(rojo)
    assert.equal(rojo!.quantityOnHand, 5)
    const tallas = rojo!.children ?? []
    assert.equal(tallas.find((t) => t.label === 'Talla: M')?.quantityOnHand, 3)
    assert.equal(tallas.find((t) => t.label === 'Talla: S')?.quantityOnHand, 2)
  })
})
