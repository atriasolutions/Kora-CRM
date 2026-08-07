import { assertProductIsSellable } from '../repositories/products.repository.js'

/** Valida que ningún productId de línea sea un agrupador (padre). */
export async function assertDocumentLineProductsAreSellable(
  items: { productId?: string | null }[] | undefined,
): Promise<void> {
  if (!items?.length) return
  const ids = [
    ...new Set(
      items
        .map((item) => item.productId?.trim())
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  for (const id of ids) {
    await assertProductIsSellable(id)
  }
}
