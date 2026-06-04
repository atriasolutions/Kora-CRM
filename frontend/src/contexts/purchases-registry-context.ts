import { createContext } from 'react'

import type { PurchaseDetail } from '@/data/purchase-detail.mock'
import type { PurchaseListItem } from '@/data/purchases.mock'
import type { PurchaseFormValues } from '@/lib/purchase-form'
import type { ArchivedPurchaseRecord } from '@/lib/purchase-archive'

export type ArchivedPurchaseEntry = ArchivedPurchaseRecord & {
  purchase: PurchaseListItem
}

export type PurchasesRegistryValue = {
  userPurchases: PurchaseListItem[]
  allPurchases: PurchaseListItem[]
  archivedPurchases: ArchivedPurchaseEntry[]
  findById: (id: string) => PurchaseListItem | undefined
  addPurchase: (values: PurchaseFormValues) => Promise<PurchaseListItem>
  updatePurchaseFromDetail: (detail: PurchaseDetail) => Promise<PurchaseDetail>
  archivePurchase: (id: string) => Promise<void>
  archivePurchases: (ids: string[]) => Promise<void>
  restorePurchase: (id: string) => Promise<void>
  restorePurchases: (ids: string[]) => Promise<void>
  permanentlyDeletePurchase: (id: string) => Promise<void>
  permanentlyDeletePurchases: (ids: string[]) => Promise<void>
  isArchived: (id: string) => boolean
  reloadFromApi: () => Promise<void>
}

export const PurchasesRegistryContext = createContext<PurchasesRegistryValue | null>(null)
