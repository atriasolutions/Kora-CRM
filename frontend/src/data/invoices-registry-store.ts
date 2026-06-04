import type { InvoiceListItem } from '@/data/invoices.mock'

let registrySnapshot: InvoiceListItem[] = []

export function syncRegistryInvoices(items: InvoiceListItem[]) {
  registrySnapshot = items
}

export function getRegistryInvoiceById(id: string): InvoiceListItem | undefined {
  return registrySnapshot.find((inv) => inv.id === id)
}

export function getAllKnownInvoices(): InvoiceListItem[] {
  return registrySnapshot
}
