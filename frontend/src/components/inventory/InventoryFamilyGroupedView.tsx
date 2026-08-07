import { ChevronDown, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import type { InventoryListItem } from '@/data/inventory.mock'
import { useProductsRegistry } from '@/hooks/use-products-registry'
import {
  groupInventoryByFamily,
  type InventoryFamilyLeaf,
  type InventoryFamilyNode,
} from '@/lib/product-variants'
import { cn } from '@/lib/utils'

type InventoryFamilyGroupedViewProps = {
  rows: InventoryListItem[]
  query: string
}

function NodeRow({
  node,
  depth,
}: {
  node: InventoryFamilyNode
  depth: number
}) {
  const [open, setOpen] = useState(depth < 2)
  const hasChildren = (node.children?.length ?? 0) > 0
  const leaf = node.leaf

  return (
    <div className="border-b border-border last:border-b-0">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2.5 text-sm',
          depth === 0 && 'bg-muted/30 font-semibold',
        )}
        style={{ paddingInlineStart: 12 + depth * 16 }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="rounded p-0.5 text-muted-foreground hover:bg-muted"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        ) : (
          <span className="inline-block size-5" />
        )}
        <div className="min-w-0 flex-1">
          {leaf ? (
            <Link
              to={`/inventario/sku-${encodeURIComponent(leaf.sku.toLowerCase())}`}
              className="font-medium text-primary hover:underline"
            >
              {leaf.productName}
              <span className="ms-2 font-mono text-xs text-muted-foreground">
                {leaf.sku}
              </span>
            </Link>
          ) : (
            <span>{node.label}</span>
          )}
        </div>
        <div className="w-20 text-end tabular-nums">{node.quantityOnHand}</div>
        <div className="w-20 text-end tabular-nums text-muted-foreground">
          {node.quantityReserved}
        </div>
        <div className="w-20 text-end tabular-nums">{node.quantityAvailable}</div>
      </div>
      {open && hasChildren
        ? node.children!.map((child) => (
            <NodeRow key={child.key} node={child} depth={depth + 1} />
          ))
        : null}
    </div>
  )
}

export function InventoryFamilyGroupedView({
  rows,
  query,
}: InventoryFamilyGroupedViewProps) {
  const { allProducts } = useProductsRegistry()

  const families = useMemo(() => {
    const q = query.trim().toLowerCase()
    const byParent = new Map<
      string,
      {
        name: string
        optionOrder: string[]
        leaves: InventoryFamilyLeaf[]
      }
    >()
    const standalone: InventoryFamilyLeaf[] = []

    for (const row of rows) {
      if (
        q &&
        !row.productName.toLowerCase().includes(q) &&
        !row.sku.toLowerCase().includes(q)
      ) {
        continue
      }
      const product = allProducts.find(
        (p) =>
          p.sku.trim().toLowerCase() === row.sku.trim().toLowerCase() ||
          p.name === row.productName,
      )
      const leaf: InventoryFamilyLeaf = {
        productId: product?.id ?? row.id,
        sku: row.sku,
        productName: row.productName,
        attributes: product?.variantAttributes ?? {},
        quantityOnHand: row.onHandQtyNum ?? row.quantityNum,
        quantityReserved: row.reservedQtyNum ?? 0,
        quantityAvailable: row.availableQtyNum ?? row.quantityNum,
        warehouseName: row.location,
      }

      if (product?.parentProductId) {
        const parent =
          allProducts.find((p) => p.id === product.parentProductId) ?? null
        const parentId = product.parentProductId
        const entry = byParent.get(parentId) ?? {
          name: parent?.name ?? product.parentName ?? 'Familia',
          optionOrder:
            parent?.variantOptions?.map((o) => o.name) ??
            Object.keys(product.variantAttributes ?? {}),
          leaves: [],
        }
        entry.leaves.push(leaf)
        byParent.set(parentId, entry)
      } else if ((product?.variantsCount ?? 0) > 0) {
        // Skip parent product rows if they somehow appear in inventory
        continue
      } else {
        standalone.push(leaf)
      }
    }

    const groups: { key: string; title: string; tree: InventoryFamilyNode[] }[] =
      []

    for (const [parentId, entry] of byParent) {
      const tree = groupInventoryByFamily(entry.leaves, entry.optionOrder)
      if (tree[0]) {
        tree[0] = { ...tree[0], label: entry.name }
      }
      groups.push({ key: parentId, title: entry.name, tree })
    }

    for (const leaf of standalone) {
      groups.push({
        key: `simple:${leaf.sku}`,
        title: leaf.productName,
        tree: [
          {
            key: leaf.sku,
            label: leaf.productName,
            quantityOnHand: leaf.quantityOnHand,
            quantityReserved: leaf.quantityReserved,
            quantityAvailable: leaf.quantityAvailable,
            leaf,
          },
        ],
      })
    }

    return groups.sort((a, b) => a.title.localeCompare(b.title, 'es'))
  }, [allProducts, query, rows])

  if (families.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        No hay posiciones de inventario para mostrar.
      </p>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
        <span className="flex-1">Producto / variedad</span>
        <span className="w-20 text-end">En bodega</span>
        <span className="w-20 text-end">Reservado</span>
        <span className="w-20 text-end">Disponible</span>
      </div>
      {families.map((fam) =>
        fam.tree.map((node) => (
          <NodeRow key={`${fam.key}:${node.key}`} node={node} depth={0} />
        )),
      )}
    </div>
  )
}
