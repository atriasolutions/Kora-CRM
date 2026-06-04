import { createContext } from 'react'

import type { InvoiceDetail } from '@/data/invoice-detail.mock'
import type { InvoiceListItem } from '@/data/invoices.mock'
import type { CreateInvoiceFormValues } from '@/lib/invoice-create'
import type { ArchivedInvoiceRecord } from '@/lib/invoice-archive'

export type ArchivedInvoiceEntry = ArchivedInvoiceRecord & {
  invoice: InvoiceListItem
}

export type InvoicesRegistryContextValue = {
  userInvoices: InvoiceListItem[]
  allInvoices: InvoiceListItem[]
  archivedInvoices: ArchivedInvoiceEntry[]
  findById: (id: string) => InvoiceListItem | undefined
  addInvoice: (values: CreateInvoiceFormValues) => Promise<InvoiceListItem>
  addInvoices: (values: CreateInvoiceFormValues[]) => Promise<InvoiceListItem[]>
  updateInvoiceFromDetail: (detail: InvoiceDetail) => Promise<void>
  patchInvoiceStatus: (
    id: string,
    status: string,
    siiNumber?: string,
  ) => Promise<InvoiceDetail>
  archiveInvoice: (id: string) => Promise<void>
  archiveInvoices: (ids: string[]) => Promise<void>
  restoreInvoice: (id: string) => Promise<void>
  restoreInvoices: (ids: string[]) => Promise<void>
  permanentlyDeleteInvoice: (id: string) => Promise<void>
  permanentlyDeleteInvoices: (ids: string[]) => Promise<void>
  isArchived: (id: string) => boolean
  reloadFromApi: () => Promise<void>
}

export const InvoicesRegistryContext =
  createContext<InvoicesRegistryContextValue | null>(null)
