/** @deprecated Usar `@/lib/purchase-form` (PurchaseFormValues). */
export type {
  PurchaseFormValues as CreatePurchaseFormValues,
} from '@/lib/purchase-form'

export {
  createDefaultPurchaseFormValues,
  createPurchaseId,
  purchaseFormValuesToDetailOverride as formValuesToDetailOverride,
  purchaseFormValuesToListItem as formValuesToListItem,
  PURCHASE_STATUS_OPTIONS,
} from '@/lib/purchase-form'

import type { PurchaseFormValues } from '@/lib/purchase-form'
import { validatePurchaseForm } from '@/lib/purchase-form'

/** @deprecated Usar validatePurchaseForm */
export function validateCreatePurchaseForm(values: PurchaseFormValues): string | null {
  return validatePurchaseForm(values)
}

/** @deprecated Usar lineItems en PurchaseFormValues */
export function buildLineItemsFromCreateForm(
  values: PurchaseFormValues,
  _purchaseId: string,
) {
  return values.lineItems.filter((li) => li.product.trim())
}
